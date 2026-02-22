import { Sender } from 'sacn';

const SACN_SOURCE_NAME = 'Parallux';

export class SacnSender {
  private readonly priority: number;
  private readonly useUnicastDestination?: string;
  private senders = new Map<number, Sender>();

  constructor({ priority, useUnicastDestination }: { priority: number; useUnicastDestination?: string }) {
    this.priority = priority;
    this.useUnicastDestination = useUnicastDestination;
  }

  private getOrCreateSender(universe: number): Sender {
    let sender = this.senders.get(universe);
    if (!sender) {
      sender = new Sender({
        universe,
        defaultPacketOptions: {
          sourceName: SACN_SOURCE_NAME,
          priority: this.priority,
          useRawDmxValues: true,
        },
        ...(this.useUnicastDestination ? { useUnicastDestination: this.useUnicastDestination } : {}),
      });
      this.senders.set(universe, sender);
    }
    return sender;
  }

  send(universePayloads: Map<number, { [channel: number]: number }>): void {
    for (const [universe, channels] of universePayloads) {
      const sender = this.getOrCreateSender(universe);
      sender.send({ payload: channels }).catch((err) => {
        console.error(`sACN send error on universe ${universe}:`, err);
      });
    }
  }

  destroy(): void {
    for (const sender of this.senders.values()) {
      sender.close();
    }
    this.senders.clear();
  }
}