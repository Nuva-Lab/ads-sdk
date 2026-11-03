import type { MessagePart, ResourceLink, MessageView, MessageRef } from './types.js';

export interface DraftValue {
	content: MessagePart[];
	attachments: ResourceLink[];
	replyTo?: MessageRef;
}
const values = new WeakMap<MessageDraft, DraftValue>();
function clone<T>(value: T): T {
	return structuredClone(value);
}
function validateResource(record: ResourceLink): ResourceLink {
	if (!record?.ref?.kind || !record.ref.id || typeof record.label !== 'string')
		throw new TypeError('A saved record with kind, id and label is required.');
	return { ref: clone(record.ref), label: record.label };
}
export class MessageDraft {
	private constructor(value: DraftValue) {
		values.set(this, clone(value));
		Object.freeze(this);
	}
	static empty(): MessageDraft {
		return new MessageDraft({ content: [], attachments: [] });
	}
	private append(part: MessagePart): MessageDraft {
		const v = draftValue(this);
		return new MessageDraft({ ...v, content: [...v.content, part] });
	}
	text(text: string): MessageDraft {
		if (typeof text !== 'string') throw new TypeError('Message text must be a string.');
		return this.append({ id: crypto.randomUUID(), type: 'text', format: 'plain', text });
	}
	/** @deprecated Use quote(record) for an inline resource reference. */
	mention(record: ResourceLink): MessageDraft {
		return this.quote(record);
	}
	/** Attaches a resource. A record without a display label (an Asset whose `label` is null) is shown by its ID. */
	attach(record: ResourceLink | (Omit<ResourceLink, 'label'> & { label: string | null })): MessageDraft {
		const saved = validateResource({ ...record, label: record.label ?? record.ref.id });
		const v = draftValue(this);
		return new MessageDraft({ ...v, attachments: [...v.attachments, saved] });
	}
	quote(target: ResourceLink | (Omit<ResourceLink, 'label'> & { label: string | null }) | MessageView, selectedText?: string): MessageDraft {
		if (selectedText !== undefined && (typeof selectedText !== 'string' || !selectedText))
			throw new TypeError('A non-empty quotation is required.');
		const quoted = 'role' in target ? clone(target.ref) : validateResource({ ...target, label: target.label ?? target.ref.id });
		return this.append({
			id: crypto.randomUUID(),
			type: 'quote',
			target: quoted,
			...(selectedText === undefined ? {} : { text: selectedText }),
		});
	}
	replyTo(message: MessageView): MessageDraft {
		if (!message?.ref?.sessionId || !message.ref.messageId) throw new TypeError('A saved message is required.');
		return new MessageDraft({ ...draftValue(this), replyTo: message.ref });
	}
}
export function draftValue(draft: MessageDraft): DraftValue {
	const value = values.get(draft);
	if (!value) throw new TypeError('Use Message.text() or Message.create() to construct messages.');
	return clone(value);
}
export const Message = Object.freeze({ create: () => MessageDraft.empty(), text: (text: string) => MessageDraft.empty().text(text) });

