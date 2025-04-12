// todo.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#todo-form');
    const input = document.querySelector('#todo-input');
    const list = document.querySelector('#todo-list');
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const task = input.value.trim();
      if (task !== '') {
        const li = document.createElement('li');
        li.textContent = task;
  
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => li.remove();
  
        li.appendChild(deleteBtn);
        list.appendChild(li);
        input.value = '';
      }
    });
  });
  
  