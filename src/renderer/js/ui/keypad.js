/**
 * keypad.js
 * MA3 커맨드 섹션의 가상 하드웨어 키패드(공용).
 * commandBar 와 consoleView 가 동일한 키 배치를 공유한다.
 */

// [label, kind]  kind: k=keyword, n=number, o=operator, c=clear, p=please
export const KEY_ROWS = [
  [['Fixture', 'k'], ['Group', 'k'], ['7', 'n'], ['8', 'n'], ['9', 'n'], ['Thru', 'k']],
  [['Cue', 'k'], ['Store', 'k'], ['4', 'n'], ['5', 'n'], ['6', 'n'], ['+', 'o']],
  [['Go', 'k'], ['Off', 'k'], ['1', 'n'], ['2', 'n'], ['3', 'n'], ['-', 'o']],
  [['At', 'k'], ['Full', 'k'], ['0', 'n'], ['.', 'n'], ['Clear', 'c'], ['Please', 'p']],
];

/** 키패드 DOM 생성. onPress(label) 콜백. */
export function buildKeypad(container, onPress) {
  container.innerHTML = '';
  for (const row of KEY_ROWS) {
    const r = document.createElement('div');
    r.className = 'key-row';
    for (const [label, kind] of row) {
      const btn = document.createElement('button');
      btn.className = `hw-key hw-${kind}`;
      btn.textContent = label;
      btn.dataset.key = label;
      btn.onclick = () => onPress(label);
      r.appendChild(btn);
    }
    container.appendChild(r);
  }
}
