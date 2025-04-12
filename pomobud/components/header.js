export function renderHeader() {
    const header = document.createElement('header');
    header.id = 'app-header';
    header.innerHTML = `
      <h1>PomoBuddy</h1>
      <button id="todo-button">To-Do List</button>
    `;
  
    document.body.prepend(header);
  
    // Open todo list in a new tab
    const todoButton = header.querySelector('#todo-button');
    todoButton.addEventListener('click', () => {
      window.open('todo.html', '_blank');
    });
  }
  