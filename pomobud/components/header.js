export function renderHeader() {
  const header = document.createElement('header');
  header.id = 'app-header';
  header.innerHTML = `<h1>PomoBuddy</h1>`;
  document.body.prepend(header);
}