import { renderPublicView, mountPublicView } from './dashboards/public.js?v=20261022-title-first';

const root = document.querySelector('#student-app');

function render() {
  root.innerHTML = renderPublicView();
  mountPublicView(root, { onChange: render });
}

render();
