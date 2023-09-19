// Dependencies: Make sure to include JSZip and JSZip-utils libraries in your HTML
// for ZIP file creation and download functionalities.

// Fetch JSON data from a URL
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }
    return await response.json();
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
    if (ignoreList.includes(fileName)) {
      return;
    }
    let parts = item.path.split('/');
    let subtree = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!subtree.children[part]) {
        if (i === parts.length - 1) {
          subtree.children[part] = { type: item.type, path: item.path, url: item.url, children: {} };
        } else {
          subtree.children[part] = { type: 'tree', path: part, children: {} };
        }
      }
      subtree = subtree.children[part];
    }
  });
  return root.children;
}

// Function to handle file/folder click for downloading
function handleFileDownload(blobUrl) {
    const link = document.createElement("a");
    link.href = blobUrl;
    
    // Generate the current date-time string
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const formattedDateTime = `${formattedDate}-${formattedTime}`;
    
    // Set the download attribute to the formatted date-time string
    link.download = `bible-data-${formattedDateTime}.zip`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  

// Zip and download selected files
async function zipAndDownloadFiles(selectedFiles) {
    const zip = new JSZip();
    const folder = zip.folder('repo');
    
    // Create an array to hold promises for each fetch operation
    const fileFetchPromises = selectedFiles.map(async (file) => {
      try {
        // Fetch the file and convert it to blob
        const response = await fetch(file.url);
        const blob = await response.blob();
        
        // Add the file blob to the zip folder
        folder.file(file.path, blob);
        
        return true; // Successful fetch and addition
      } catch (error) {
        console.error(`Failed to fetch and add ${file.path}: ${error}`);
        return false; // Unsuccessful fetch and addition
      }
    });
    
    try {
      // Wait for all file fetch operations to complete
      const results = await Promise.all(fileFetchPromises);
      
      // Check for any failures
      const allSuccessful = results.every(result => result);
      if (!allSuccessful) {
        console.error("Failed to fetch one or more files.");
        return;
      }
      
      // Generate and download the zip
      const blob = await zip.generateAsync({ type: 'blob' });
      handleFileDownload(URL.createObjectURL(blob), 'repo.zip');
      
    } catch (error) {
      console.error(`An exception occurred while zipping: ${error}`);
    }
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
    selectBox.onclick = function() {
      if (this.checked) {
        selectedFiles.push(item);
      } else {
        const index = selectedFiles.indexOf(item);
        if (index > -1) {
          selectedFiles.splice(index, 1);
        }
      }
      document.getElementById('downloadBtn').innerText = `Download (${selectedFiles.length} files)`;
    };
    liElement.appendChild(selectBox);

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
  try {
    const selectedFiles = [];
    const config = await fetchJson('./config.json');
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

    if (!treeDiv) {
      console.error("Missing 'github-tree-container' in HTML");
      return;
    }

    buildTree(hierarchicalData, treeDiv, selectedFiles);
  } catch (error) {
    console.error(`An exception occurred: ${error}`);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', populateGithubTree);
