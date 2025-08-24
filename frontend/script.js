

AWS.config.region = 'ap-south-1';
   const userPoolId = 'ap-south-1_MrHRwS4s3';
   const clientId = '5o9orjao4lb8o7rb89bppd8jpq';
   const apiUrl = 'https://t3qjp80dxd.execute-api.ap-south-1.amazonaws.com/prod/tasks'; // Replace with API Gateway URL
   let idToken = null;

   // Show alert messages
   function showAlert(message, type) {
       const authMessage = document.getElementById('authMessage');
       authMessage.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
           ${message}
           <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
       </div>`;
   }

   // Sign Up
   async function signUp() {
       const email = document.getElementById('email').value;
       const password = document.getElementById('password').value;
       const cognito = new AWS.CognitoIdentityServiceProvider();
       try {
           await cognito.signUp({
               ClientId: clientId,
               Username: email,
               Password: password,
               UserAttributes: [{ Name: 'email', Value: email }]
           }).promise();
           showAlert('Sign-up successful! Check your email for verification code.', 'success');
       } catch (error) {
           console.error('Sign-up error:', error);
           showAlert(error.message, 'danger');
       }
   }

   // Sign In
   async function signIn() {
       const email = document.getElementById('email').value;
       const password = document.getElementById('password').value;
       const cognito = new AWS.CognitoIdentityServiceProvider();
       try {
           const response = await cognito.initiateAuth({
               AuthFlow: 'USER_PASSWORD_AUTH',
               ClientId: clientId,
               AuthParameters: { USERNAME: email, PASSWORD: password }
           }).promise();
           idToken = response.AuthenticationResult.IdToken;
           document.getElementById('auth').style.display = 'none';
           document.getElementById('tasks').style.display = 'block';
           document.getElementById('logoutButton').style.display = 'block';
           showAlert('Signed in successfully!', 'success');
           fetchTasks();
       } catch (error) {
           console.error('Sign-in error:', error);
           showAlert(error.message, 'danger');
       }
   }

   // Sign Out
   function signOut() {
       idToken = null;
       document.getElementById('auth').style.display = 'block';
       document.getElementById('tasks').style.display = 'none';
       document.getElementById('logoutButton').style.display = 'none';
       document.getElementById('email').value = '';
       document.getElementById('password').value = '';
       showAlert('Signed out successfully.', 'success');
   }

   // Get Presigned URL for File Upload
   async function getPresignedUrl(fileName) {
       try {
           const response = await fetch(`${apiUrl.replace('/tasks', '')}/presigned`, {
               method: 'POST',
               headers: { 'Authorization': idToken, 'Content-Type': 'application/json' },
               body: JSON.stringify({ fileName })
           });
           if (!response.ok) throw new Error('Failed to get presigned URL');
           return await response.json();
       } catch (error) {
           console.error('Presigned URL error:', error);
           showAlert(error.message, 'danger');
           throw error;
       }
   }

   // Create Task with Optional File Upload
   async function uploadFileAndCreateTask() {
       const title = document.getElementById('taskTitle').value;
       const file = document.getElementById('taskFile').files[0];
       let attachmentKey = null;
       try {
           if (file) {
               const { presignedUrl, objectKey } = await getPresignedUrl(file.name);
               await fetch(presignedUrl, { method: 'PUT', body: file });
               attachmentKey = objectKey;
           }
           const response = await fetch(apiUrl, {
               method: 'POST',
               headers: { 'Authorization': idToken, 'Content-Type': 'application/json' },
               body: JSON.stringify({ title, attachmentKey })
           });
           if (!response.ok) throw new Error('Failed to create task');
           showAlert('Task created successfully!', 'success');
           document.getElementById('taskTitle').value = '';
           document.getElementById('taskFile').value = '';
           fetchTasks();
       } catch (error) {
           console.error('Create task error:', error);
           showAlert(error.message, 'danger');
       }
   }

   // Fetch and Display Tasks
   async function fetchTasks() {
       try {
           const response = await fetch(apiUrl, {
               method: 'GET',
               headers: { 'Authorization': idToken, 'Content-Type': 'application/json' }
           });
           if (!response.ok) throw new Error('Failed to fetch tasks');
           const tasks = await response.json();
           const taskList = document.getElementById('taskList').getElementsByTagName('tbody')[0];
           taskList.innerHTML = '';
           tasks.forEach(task => {
               const row = taskList.insertRow();
               row.insertCell(0).textContent = task.taskId;
               row.insertCell(1).textContent = task.title;
               row.insertCell(2).textContent = task.status;
               row.insertCell(3).innerHTML = task.attachmentKey ? `<a href="https://<attachments-bucket-name>.s3.us-east-1.amazonaws.com/${task.attachmentKey}" target="_blank">View</a>` : '-';
               row.insertCell(4).innerHTML = `
                   <button class="btn btn-sm btn-warning me-1" onclick="updateTask('${task.taskId}', '${task.title}')">Update</button>
                   <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.taskId}')">Delete</button>
               `;
           });
       } catch (error) {
           console.error('Fetch tasks error:', error);
           showAlert(error.message, 'danger');
       }
   }

   // Update Task
   async function updateTask(taskId, currentTitle) {
       const newTitle = prompt('Enter new title:', currentTitle);
       const newStatus = prompt('Enter new status (pending/completed):', 'pending');
       if (!newTitle || !newStatus) return;
       try {
           const response = await fetch(`${apiUrl}/${taskId}`, {
               method: 'PUT',
               headers: { 'Authorization': idToken, 'Content-Type': 'application/json' },
               body: JSON.stringify({ title: newTitle, status: newStatus })
           });
           if (!response.ok) throw new Error('Failed to update task');
           showAlert('Task updated successfully!', 'success');
           fetchTasks();
       } catch (error) {
           console.error('Update task error:', error);
           showAlert(error.message, 'danger');
       }
   }

   // Delete Task
   async function deleteTask(taskId) {
       if (!confirm('Are you sure you want to delete this task?')) return;
       try {
           const response = await fetch(`${apiUrl}/${taskId}`, {
               method: 'DELETE',
               headers: { 'Authorization': idToken, 'Content-Type': 'application/json' }
           });
           if (!response.ok) throw new Error('Failed to delete task');
           showAlert('Task deleted successfully!', 'success');
           fetchTasks();
       } catch (error) {
           console.error('Delete task error:', error);
           showAlert(error.message, 'danger');
       }
   }