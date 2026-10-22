import { renderPublicView, mountPublicView } from './dashboards/public.js?v=20261022-csc-filter';

const root = document.querySelector('#student-app');

function render() {
  root.innerHTML = renderPublicView();
  mountPublicView(root, { onChange: render });
}

render();
