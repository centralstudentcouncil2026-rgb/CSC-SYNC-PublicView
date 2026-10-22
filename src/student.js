import { renderPublicView, mountPublicView } from './dashboards/public.js?v=20261022-public-feedback';
import { captureFormView, deferFormRender } from './shared/form-view.js?v=20261021-panel-scroll';

const root = document.querySelector('#student-app');

function render() {
  if (deferFormRender(root, render)) return;
  const restore = captureFormView(root, 'student-calendar');
  root.innerHTML = renderPublicView();
  mountPublicView(root, { onChange: render });
  restore();
}

render();
