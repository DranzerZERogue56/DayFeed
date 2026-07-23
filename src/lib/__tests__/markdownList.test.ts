import {
  continueListOnEnter,
  normalizeCheckboxTrigger,
  parseMarkdownLines,
  toggleCheckboxLine,
} from '../markdownList';

describe('parseMarkdownLines', () => {
  it('classifies plain, ordered, bullet, and checkbox lines', () => {
    const out = parseMarkdownLines('hello\n1. first\n- second\n[ ] third\n[x] fourth');
    expect(out).toEqual([
      { type: 'plain', body: 'hello' },
      { type: 'ordered', order: 1, body: 'first' },
      { type: 'bullet', body: 'second' },
      { type: 'checkbox', checked: false, body: 'third' },
      { type: 'checkbox', checked: true, body: 'fourth' },
    ]);
  });

  it('treats a marker with no trailing space as plain text', () => {
    expect(parseMarkdownLines('1.no space')[0].type).toBe('plain');
    expect(parseMarkdownLines('-nospace')[0].type).toBe('plain');
    expect(parseMarkdownLines('[]nospace')[0].type).toBe('plain');
  });
});

describe('continueListOnEnter', () => {
  it('continues a bullet list', () => {
    const text = '- first\n';
    const out = continueListOnEnter(text, text.length);
    expect(out).toEqual({ text: '- first\n- ', cursor: 10 });
  });

  it('continues an ordered list, incrementing the number', () => {
    const text = '1. first\n';
    const out = continueListOnEnter(text, text.length);
    expect(out).toEqual({ text: '1. first\n2. ', cursor: 12 });
  });

  it('continues an ordered list from an arbitrary starting number', () => {
    const text = '9. ninth\n';
    const out = continueListOnEnter(text, text.length);
    expect(out?.text).toBe('9. ninth\n10. ');
  });

  it('continues a checkbox list with an unchecked box', () => {
    const text = '[x] done\n';
    const out = continueListOnEnter(text, text.length);
    expect(out).toEqual({ text: '[x] done\n[ ] ', cursor: 13 });
  });

  it('breaks out of the list when Enter is pressed on an empty item', () => {
    // The empty "- " item and its own trailing newline are both removed,
    // leaving the cursor right after "first"'s line — an implicit blank line.
    const text = '- first\n- \n';
    const out = continueListOnEnter(text, text.length);
    expect(out).toEqual({ text: '- first\n', cursor: 8 });
  });

  it('breaks out mid-document, preserving what came after', () => {
    const text = '- first\n- \nplain tail';
    const out = continueListOnEnter(text, 11); // cursor right after "- \n"
    expect(out).toEqual({ text: '- first\nplain tail', cursor: 8 });
  });

  it('returns null when the previous line is plain text', () => {
    const text = 'just a note\n';
    expect(continueListOnEnter(text, text.length)).toBeNull();
  });

  it('returns null when the cursor is not right after a newline', () => {
    expect(continueListOnEnter('- first', 7)).toBeNull();
  });

  it('continues the list from a mid-document line, not just the end', () => {
    const text = '- first\n- second\nplain tail';
    // cursor right after "- first\n"
    const out = continueListOnEnter(text, 8);
    expect(out?.text).toBe('- first\n- - second\nplain tail');
  });
});

describe('normalizeCheckboxTrigger', () => {
  it('rewrites "[] " at the start of a line to "[ ] "', () => {
    const text = '[] ';
    const out = normalizeCheckboxTrigger(text, text.length);
    expect(out).toEqual({ text: '[ ] ', cursor: 4 });
  });

  it('works after a newline, not just at the start of the document', () => {
    const text = 'note\n[] ';
    const out = normalizeCheckboxTrigger(text, text.length);
    expect(out?.text).toBe('note\n[ ] ');
  });

  it('does not trigger mid-line', () => {
    const text = 'buy milk [] ';
    expect(normalizeCheckboxTrigger(text, text.length)).toBeNull();
  });

  it('does not trigger without the trailing space', () => {
    expect(normalizeCheckboxTrigger('[]', 2)).toBeNull();
  });
});

describe('toggleCheckboxLine', () => {
  it('checks an unchecked box', () => {
    expect(toggleCheckboxLine('[ ] buy milk', 0)).toBe('[x] buy milk');
  });

  it('unchecks a checked box', () => {
    expect(toggleCheckboxLine('[x] buy milk', 0)).toBe('[ ] buy milk');
  });

  it('toggles only the targeted line among many', () => {
    const text = '[ ] one\n[ ] two\n[x] three';
    expect(toggleCheckboxLine(text, 1)).toBe('[ ] one\n[x] two\n[x] three');
  });

  it('leaves the text unchanged for a non-checkbox or out-of-range line', () => {
    expect(toggleCheckboxLine('plain line', 0)).toBe('plain line');
    expect(toggleCheckboxLine('[ ] one', 5)).toBe('[ ] one');
  });
});
