import { Component, html } from '@rxdi/lit-html';

/**
 * @customElement app-component
 */
@Component({
  selector: 'app-component',
  template() {
    return html` <d3-map></d3-map> `;
  },
  container: document.body,
})
export class AppComponent extends HTMLElement {}
