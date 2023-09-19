// Dependencies: Ensure JSZip and JSZip-utils libraries are included for ZIP functionalities.

// Fetch JSON data from a URL
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`HTTP Error: ${response.status}, ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Exception while fetching ${url}: ${error}`);
    return null;
  }
}

// Convert flat GitHub tree to hierarchical structure
function convertToHierarchical(treeData, ignoreList) {
  const root = { type: 'tree', children: {} };
  treeData.forEach(item => {
    const fileName = item.path.split('/').pop();
    if (!ignoreList.includes(fileName)) {
      let subtree = root;
      item.path.split('/').forEach((part, i, arr) => {
        if (!subtree.children[part]) {
          subtree.children[part] = {
            type: i === arr.length - 1 ? item.type : 'tree',
            path: item.path,
            url: item.url,
            children: {}
          };
        }
        subtree = subtree.children[part];
      });
    }
  });
  return root.children;
}

// Recursive function to select all children of a folder
function selectAllChildren(folderItem, isSelected, selectedFiles) {
  Object.values(folderItem.children).forEach(childItem => {
    if (childItem.type === 'blob') {
      const index = selectedFiles.indexOf(childItem);
      if (isSelected && index === -1) {
        selectedFiles.push(childItem);
      } else if (!isSelected && index > -1) {
        selectedFiles.splice(index, 1);
      }
    } else if (childItem.type === 'tree') {
      selectAllChildren(childItem, isSelected, selectedFiles);
    }
  });
}

// Function to handle file/folder click for downloading
function handleFileDownload(blobUrl) {
  const link = document.createElement("a");
  link.href = blobUrl;
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const formattedTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const formattedDateTime = `${formattedDate}-${formattedTime}`;
  link.download = `bible-data-${formattedDateTime}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Zip and download selected files
async function zipAndDownloadFiles(selectedFiles) {
  const zip = new JSZip();
  const folder = zip.folder('repo');
  const fileFetchPromises = selectedFiles.map(async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      folder.file(file.path, blob);
      return true;
    } catch (error) {
      console.error(`Failed to fetch and add ${file.path}: ${error}`);
      return false;
    }
  });
  
  const results = await Promise.all(fileFetchPromises);
  const allSuccessful = results.every(result => result);
  if (!allSuccessful) {
    console.error("Failed to fetch one or more files.");
    return;
  }
  
  const blob = await zip.generateAsync({ type: 'blob' });
  handleFileDownload(URL.createObjectURL(blob));
}

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

// Populate GitHub tree
async function populateGithubTree() {
  const selectedFiles = [];
  const config = await fetchJson('config/config.json');
  if (!config || !config.githubRepoUrl) {
    console.error("Missing configuration or 'githubRepoUrl'");
    return;
  }
  const ignoreList = config.ignore || [];
  const urlParts = config.githubRepoUrl.split('/');
  const user = urlParts[3];
  const repo = urlParts[4].replace('.git', '');
  
  const apiUrl = `https://api.github.com/repos/${user}/${repo}/git/trees/master?recursive=1`;
  const treeData = await fetchJson(apiUrl);
  
  if (!treeData || !treeData.tree) {
    console.error("Failed to fetch or parse GitHub tree data");
    return;
  }
  
  const hierarchicalData = convertToHierarchical(treeData.tree, ignoreList);
  const treeDiv = document.getElementById('github-tree-container');
  
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'downloadBtn';
  downloadBtn.innerText = 'Download (0 files)';
  downloadBtn.onclick = function() {
    zipAndDownloadFiles(selectedFiles);
  };
  
  treeDiv.appendChild(downloadBtn);
  buildTree(hierarchicalData, treeDiv, selectedFiles);
}

// Initialize
document.addEventListener('DOMContentLoaded', populateGithubTree);
