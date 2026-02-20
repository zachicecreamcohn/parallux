import { Sender } from 'sacn';

export class SacnSender {
  private readonly priority: number;
  private readonly senders = new Map<number, Sender>();
  private readonly iface?: string;
  private readonly useUnicastDestination?: string;

  constructor({ priority, iface, useUnicastDestination }: { priority: number; iface?: string; useUnicastDestination?: string }) {
    this.priority = priority;
    this.iface = iface;
    this.useUnicastDestination = useUnicastDestination;
  }

  send(universeBuffers: Map<number, Buffer>): void {
    for (const [universe, buf] of universeBuffers) {
      if (!this.senders.has(universe)) {
        this.senders.set(
          universe,
          new Sender({
            universe,
            iface: this.iface,
            useUnicastDestination: this.useUnicastDestination,
            defaultPacketOptions: { priority: this.priority, useRawDmxValues: true },
          }),
        );
      }

      const payload: { [channel: number]: number } = {};
      for (let i = 0; i < 512; i++) {
        payload[i + 1] = buf[i] ?? 0;
      }
      const sender = this.senders.get(universe);
      if (sender) {
        sender.send({ payload }).catch((err: unknown) => {
          console.error(`sACN send error on universe ${universe}:`, err);
        });
      }
    }
  }

  destroy(): void {
    for (const sender of this.senders.values()) {
      sender.close();
    }
    this.senders.clear();
  }
}