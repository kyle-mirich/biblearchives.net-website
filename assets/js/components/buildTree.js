// Recursive function to build the folder tree
function buildTree(hierarchicalData, parentElement, selectedFiles) {
    const ulElement = document.createElement('ul');
    ulElement.style.display = 'none';
    parentElement.appendChild(ulElement);
    
    Object.values(hierarchicalData).forEach(item => {
      const liElement = document.createElement('li');
      ulElement.appendChild(liElement);
      const selectBox = document.createElement('input');
      selectBox.type = 'checkbox';
      
      selectBox.onclick = function(event) {
        if (liElement.classList.contains('folder')) {
          const childCheckboxes = liElement.querySelectorAll('ul input[type="checkbox"]');
          childCheckboxes.forEach(childCheckbox => childCheckbox.checked = event.target.checked);
          selectAllChildren(item, event.target.checked, selectedFiles);
        } else {
          if (event.target.checked) {
            selectedFiles.push(item);
          } else {
            const index = selectedFiles.indexOf(item);
            if (index > -1) {
              selectedFiles.splice(index, 1);
            }
          }
        }
        document.getElementById('downloadBtn').innerText = `Download (${selectedFiles.length} files)`;
      };
      
      liElement.appendChild(selectBox);
      liElement.itemData = item;
      
      if (item.type === 'blob') {
        const fileLink = document.createElement('a');
        fileLink.href = item.url;
        fileLink.innerText = item.path;
        liElement.appendChild(fileLink);
        liElement.classList.add('file');
      } else {
        const folderToggle = document.createElement('span');
        folderToggle.classList.add('folder-toggle');
        folderToggle.innerText = item.path;
        liElement.appendChild(folderToggle);
        liElement.classList.add('folder');
        
        folderToggle.addEventListener('click', () => {
          const childUl = liElement.querySelector('ul');
          if (childUl) {
            childUl.style.display = childUl.style.display === 'none' ? 'block' : 'none';
          } else if (Object.keys(item.children).length > 0) {
            buildTree(item.children, liElement, selectedFiles);
            liElement.querySelector('ul').style.display = 'block';
          }
        });
      }
    });
    
    if (parentElement === document.getElementById('github-tree-container')) {
      ulElement.style.display = 'block';
    }
  }