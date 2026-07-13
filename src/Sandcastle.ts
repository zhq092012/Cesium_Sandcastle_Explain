import './Sandcastle.css';

export interface SandcastleMenuOption {
  text: string;
  onselect: () => void;
}

class SandcastleClass {
  private container: HTMLDivElement | null = null;

  /**
   * 初始化工具栏容器
   */
  private initContainer() {
    if (this.container) return;

    // Check if the toolbar element already exists in the DOM
    let el = document.getElementById('toolbar') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'toolbar';
      el.className = 'sandcastle-toolbar';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  /**
   * 清楚工具栏中的所有元素并从 DOM 中移除容器。
   * 请在 React 的 useEffect 清理函数中调用此方法。
   */
  reset() {
    if (this.container) {
      this.container.innerHTML = '';
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
    }
    // Also make sure to clean up any other element with ID 'toolbar'
    const el = document.getElementById('toolbar');
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  /**
   * Adds a section header to the toolbar.
   */
  addHeader(text: string) {
    this.initContainer();
    const header = document.createElement('div');
    header.className = 'sandcastle-header';
    header.innerText = text;
    this.container?.appendChild(header);
  }

  /**
   * Adds a standard button.
   */
  addToolbarButton(text: string, onclick: () => void) {
    this.initContainer();
    const button = document.createElement('button');
    button.className = 'sandcastle-button';
    button.innerText = text;
    button.onclick = onclick;
    this.container?.appendChild(button);
  }

  /**
   * Adds a toggle switch (checkbox style).
   */
  addToggleButton(text: string, checked: boolean, onchange: (checked: boolean) => void) {
    this.initContainer();

    const wrapper = document.createElement('div');
    wrapper.className = 'sandcastle-toggle-wrapper';

    const label = document.createElement('label');
    label.className = 'sandcastle-toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.onchange = () => {
      onchange(input.checked);
    };

    const slider = document.createElement('span');
    slider.className = 'sandcastle-toggle-slider';

    label.appendChild(input);
    label.appendChild(slider);

    const textLabel = document.createElement('span');
    textLabel.className = 'sandcastle-toggle-label';
    textLabel.innerText = text;

    wrapper.appendChild(label);
    wrapper.appendChild(textLabel);

    this.container?.appendChild(wrapper);
  }

  /**
   * Adds a dropdown select menu.
   */
  addToolbarMenu(options: SandcastleMenuOption[], title?: string) {
    this.initContainer();

    const wrapper = document.createElement('div');
    wrapper.className = 'sandcastle-menu-wrapper';

    // If a title/label is provided, render it alongside the select dropdown
    if (title && typeof title === 'string') {
      const label = document.createElement('span');
      label.className = 'sandcastle-menu-label';
      label.innerText = title;
      wrapper.appendChild(label);
    }

    const select = document.createElement('select');
    select.className = 'sandcastle-select';

    options.forEach((opt, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.text = opt.text;
      select.appendChild(option);
    });

    select.onchange = () => {
      const selectedIndex = parseInt(select.value, 10);
      if (options[selectedIndex] && typeof options[selectedIndex].onselect === 'function') {
        options[selectedIndex].onselect();
      }
    };

    wrapper.appendChild(select);
    this.container?.appendChild(wrapper);
  }

  /**
   * Adds a slider with an editable text box input for exact values.
   */
  addSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    oninput: (val: number) => void
  ) {
    this.initContainer();

    const wrapper = document.createElement('div');
    wrapper.className = 'sandcastle-slider-wrapper';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'sandcastle-slider-label';
    labelSpan.innerText = label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.className = 'sandcastle-range';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'sandcastle-slider-input';
    textInput.value = value.toString();

    slider.oninput = () => {
      textInput.value = slider.value;
      oninput(parseFloat(slider.value));
    };

    textInput.onchange = () => {
      let val = parseFloat(textInput.value);
      if (isNaN(val)) val = min;
      if (val < min) val = min;
      if (val > max) val = max;
      slider.value = val.toString();
      textInput.value = val.toString();
      oninput(val);
    };

    wrapper.appendChild(labelSpan);
    wrapper.appendChild(slider);
    wrapper.appendChild(textInput);

    this.container?.appendChild(wrapper);
  }
}

const Sandcastle = new SandcastleClass();
export default Sandcastle;
export type { SandcastleClass };
