export function renderHeader() {
    const header = document.createElement('header');
    header.id = 'app-header';
    header.innerHTML = `
      <h1>PomoBuddy</h1>
    `;
  
    document.body.prepend(header);
  
    // Open todo list in a new tab

    const style = document.createElement('style');
    style.innerHTML = `
    #app-header {
      position: sticky;
      top: 0;
      width: 100%;
      background-color: #1a1c43;
      color: white;
      text-align: center;
      font-family: 'Segoe UI', sans-serif;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
      box-sizing: border-box;
      z-index: 1000;
    }
    #app-header h1 {
      margin: 0;
      font-size: 1.8rem;
    }
    #app-header p {
      margin: 0.5rem 0 0;
      font-size: 1rem;
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style); // Add the styles to the head
}
    
  
  