import * as dgram from 'dgram';
import * as crypto from 'crypto';

const ACN_PID = Buffer.from([0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0x00, 0x00, 0x00]);
const SACN_PORT = 5568;

function multicastGroup(universe: number): string {
  return `239.255.${(universe >> 8) & 0xff}.${universe & 0xff}`;
}

function buildPacket(
  cid: Buffer,
  sourceName: string,
  priority: number,
  universe: number,
  sequence: number,
  channels: { [ch: number]: number }, // 1-indexed, raw 0-255
): Buffer {
  // Find highest channel used so we only send what we own
  let highestChannel = 0;
  for (const ch in channels) {
    const n = +ch;
    if (n >= 1 && n <= 512 && n > highestChannel) highestChannel = n;
  }
  if (highestChannel === 0) return Buffer.alloc(0);

  const slotCount = highestChannel; // number of DMX slots after start code
  const propertyValueCount = slotCount + 1; // +1 for start code slot

  // Layer lengths (flags 0x70 | length field, big-endian 16-bit)
  const dmpLen = 10 + propertyValueCount;           // DMP header(10) + slots
  const frameLen = 77 + dmpLen;                      // framing header(77) + DMP
  const rootLen = 22 + frameLen;                     // root header(22) + framing

  const totalLen = 16 + rootLen; // preamble(16) + root

  const buf = Buffer.alloc(totalLen, 0);
  let i = 0;

  // Preamble
  buf.writeUInt16BE(0x0010, i); i += 2; // preamble size
  buf.writeUInt16BE(0x0000, i); i += 2; // postamble size
  ACN_PID.copy(buf, i); i += 12;        // ACN PID

  // Root layer
  buf.writeUInt16BE(0x7000 | rootLen, i); i += 2;  // flags+length
  buf.writeUInt32BE(0x00000004, i); i += 4;         // vector: VECTOR_ROOT_E131_DATA
  cid.copy(buf, i); i += 16;                        // CID

  // Framing layer
  buf.writeUInt16BE(0x7000 | frameLen, i); i += 2; // flags+length
  buf.writeUInt32BE(0x00000002, i); i += 4;         // vector: VECTOR_E131_DATA_PACKET
  const nameBytes = Buffer.alloc(64, 0);
  nameBytes.write(sourceName.slice(0, 63), 'utf8');
  nameBytes.copy(buf, i); i += 64;                  // source name
  buf.writeUInt8(priority, i++);                    // priority
  buf.writeUInt16BE(0, i); i += 2;                  // synchronization address
  buf.writeUInt8(sequence, i++);                    // sequence number
  buf.writeUInt8(0, i++);                           // options
  buf.writeUInt16BE(universe, i); i += 2;           // universe

  // DMP layer
  buf.writeUInt16BE(0x7000 | dmpLen, i); i += 2;  // flags+length
  buf.writeUInt8(0x02, i++);                        // vector: VECTOR_DMP_SET_PROPERTY
  buf.writeUInt8(0xa1, i++);                        // address+data type
  buf.writeUInt16BE(0x0000, i); i += 2;             // first property address
  buf.writeUInt16BE(0x0001, i); i += 2;             // address increment
  buf.writeUInt16BE(propertyValueCount, i); i += 2; // property count (start code + slots)
  buf.writeUInt8(0x00, i++);                        // DMX512 start code

  // DMX slots — only up to highestChannel, unset channels stay 0
  for (let ch = 1; ch <= highestChannel; ch++) {
    buf.writeUInt8(channels[ch] ?? 0, i++);
  }

  return buf;
}

export class SacnSender {
  private readonly priority: number;
  private readonly destination: string;
  private readonly cid: Buffer;
  private readonly socket: dgram.Socket;
  private sequences = new Map<number, number>();

  constructor({ priority, useUnicastDestination }: { priority: number; useUnicastDestination?: string }) {
    this.priority = priority;
    this.destination = useUnicastDestination ?? '';
    this.cid = crypto.randomBytes(16);
    this.socket = dgram.createSocket('udp4');
  }

  send(universePayloads: Map<number, { [channel: number]: number }>): void {
    for (const [universe, channels] of universePayloads) {
      const seq = this.sequences.get(universe) ?? 0;
      this.sequences.set(universe, (seq + 1) % 256);

      const dest = this.destination || multicastGroup(universe);
      const buf = buildPacket(this.cid, 'Parallux', this.priority, universe, seq, channels);
      if (buf.length === 0) continue;

      this.socket.send(buf, SACN_PORT, dest, (err) => {
        if (err) console.error(`sACN send error on universe ${universe}:`, err);
      });
    }
  }

  destroy(): void {
    this.socket.close();
  }
}