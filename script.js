document.addEventListener('DOMContentLoaded', function() {
  // Tab functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabBtns.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Initialize dropzone functionality
  setupDropzone('hash-dropzone', 'fileInput');
  setupDropzone('compare-dropzone1', 'file1');
  setupDropzone('compare-dropzone2', 'file2');
  setupDropzone('verify-dropzone', 'verifyFileInput');

  // Button event listeners
  document.getElementById('hash-btn').addEventListener('click', checkHash);
  document.getElementById('compare-btn').addEventListener('click', compareFiles);
  document.getElementById('verify-btn').addEventListener('click', verifyHash);
  document.getElementById('copy-hash').addEventListener('click', copyHash);
  document.getElementById('clear-hash').addEventListener('click', clearHash);
});

// Show progress notification
function showProgressNotification(message, isError = false) {
  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-notification';
  document.body.appendChild(progressBar);

  // Create status notification
  const statusNotification = document.createElement('div');
  statusNotification.className = `status-notification ${isError ? 'error' : ''}`;
  statusNotification.innerHTML = `
    <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(statusNotification);

  // Remove elements after animation
  setTimeout(() => {
    progressBar.remove();
    statusNotification.remove();
  }, 3000);
}

function setupDropzone(dropzoneId, inputId) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(inputId);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropzone.classList.add('active');
  }

  function unhighlight() {
    dropzone.classList.remove('active');
  }

  dropzone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;
    
    // Display file name
    const fileName = files[0]?.name || 'No file selected';
    dropzone.querySelector('p').textContent = fileName;
    dropzone.querySelector('i').className = 'fas fa-file-alt';
  }

  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      dropzone.querySelector('p').textContent = this.files[0].name;
      dropzone.querySelector('i').className = 'fas fa-file-alt';
    }
  });
}

async function getHash(file, algorithm = 'SHA-256') {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkHash() {
  const file = document.getElementById('fileInput').files[0];
  const output = document.getElementById('hash-output');
  
  if (!file) {
    showProgressNotification('Please select a file first', true);
    output.innerHTML = '<p class="mismatch"><i class="fas fa-exclamation-circle"></i> Please select a file first</p>';
    return;
  }

  showProgressNotification('Calculating file hash...');
  
  try {
    const calculatedHash = await getHash(file);
    output.innerHTML = `
      <p><strong>File Name:</strong> ${file.name}</p>
      <p><strong>File Size:</strong> ${formatFileSize(file.size)}</p>
      <p><strong>SHA-256 Hash:</strong></p>
      <p class="hash-value">${calculatedHash}</p>
    `;
    
    // Enable copy button
    document.getElementById('copy-hash').disabled = false;
    showProgressNotification('Hash calculated successfully!');
  } catch (error) {
    output.innerHTML = `<p class="mismatch"><i class="fas fa-times-circle"></i> Error calculating hash: ${error.message}</p>`;
    showProgressNotification('Error calculating hash', true);
  }
}

async function compareFiles() {
  const file1 = document.getElementById('file1').files[0];
  const file2 = document.getElementById('file2').files[0];
  const output = document.getElementById('compare-output');

  if (!file1 || !file2) {
    showProgressNotification('Please select both files', true);
    output.innerHTML = '<p class="mismatch"><i class="fas fa-exclamation-circle"></i> Please select both files to compare</p>';
    return;
  }

  showProgressNotification('Comparing files...');
  
  try {
    const [hash1, hash2] = await Promise.all([getHash(file1), getHash(file2)]);
    
    output.innerHTML = `
      <div class="file-comparison">
        <div class="file-info">
          <p><strong>File 1:</strong> ${file1.name}</p>
          <p><strong>Size:</strong> ${formatFileSize(file1.size)}</p>
          <p><strong>Hash:</strong></p>
          <p class="hash-value">${hash1}</p>
        </div>
        <div class="file-info">
          <p><strong>File 2:</strong> ${file2.name}</p>
          <p><strong>Size:</strong> ${formatFileSize(file2.size)}</p>
          <p><strong>Hash:</strong></p>
          <p class="hash-value">${hash2}</p>
        </div>
      </div>
      <div class="comparison-result">
        ${hash1 === hash2 ? 
          '<p class="match"><i class="fas fa-check-circle"></i> Files are identical!</p>' : 
          '<p class="mismatch"><i class="fas fa-times-circle"></i> Files are different!</p>'}
      </div>
    `;
    showProgressNotification(hash1 === hash2 ? 'Files match!' : 'Files are different', hash1 !== hash2);
  } catch (error) {
    output.innerHTML = `<p class="mismatch"><i class="fas fa-times-circle"></i> Error comparing files: ${error.message}</p>`;
    showProgressNotification('Error comparing files', true);
  }
}

async function verifyHash() {
  const file = document.getElementById('verifyFileInput').files[0];
  const expectedHash = document.getElementById('expected-hash').value.trim();
  const output = document.getElementById('verify-output');

  if (!file) {
    showProgressNotification('Please select a file first', true);
    output.innerHTML = '<p class="mismatch"><i class="fas fa-exclamation-circle"></i> Please select a file first</p>';
    return;
  }

  if (!expectedHash) {
    showProgressNotification('Please enter expected hash', true);
    output.innerHTML = '<p class="mismatch"><i class="fas fa-exclamation-circle"></i> Please enter the expected hash value</p>';
    return;
  }

  showProgressNotification('Verifying file integrity...');
  
  try {
    const calculatedHash = await getHash(file);
    const isMatch = calculatedHash.toLowerCase() === expectedHash.toLowerCase();
    
    output.innerHTML = `
      <p><strong>File Name:</strong> ${file.name}</p>
      <p><strong>Calculated Hash:</strong></p>
      <p class="hash-value">${calculatedHash}</p>
      <p><strong>Expected Hash:</strong></p>
      <p class="hash-value">${expectedHash}</p>
      <div class="verification-result">
        ${isMatch ? 
          '<p class="match"><i class="fas fa-check-circle"></i> Verification successful! The file is authentic.</p>' : 
          '<p class="mismatch"><i class="fas fa-times-circle"></i> Verification failed! The file may have been altered.</p>'}
      </div>
    `;
    showProgressNotification(isMatch ? 'Verification successful!' : 'Verification failed!', !isMatch);
  } catch (error) {
    output.innerHTML = `<p class="mismatch"><i class="fas fa-times-circle"></i> Error verifying file: ${error.message}</p>`;
    showProgressNotification('Error verifying file', true);
  }
}

function copyHash() {
  const hashText = document.querySelector('.hash-value')?.textContent;
  if (!hashText) return;

  navigator.clipboard.writeText(hashText).then(() => {
    const copyBtn = document.getElementById('copy-hash');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    showProgressNotification('Hash copied to clipboard!');
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    showProgressNotification('Failed to copy hash', true);
  });
}

function clearHash() {
  document.getElementById('fileInput').value = '';
  document.getElementById('hash-output').innerHTML = '<p class="placeholder">Your file hash will appear here</p>';
  document.getElementById('copy-hash').disabled = true;
  const dropzone = document.getElementById('hash-dropzone');
  dropzone.querySelector('p').textContent = 'Drag & drop your file here or click to browse';
  dropzone.querySelector('i').className = 'fas fa-cloud-upload-alt';
  showProgressNotification('Cleared hash results');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}