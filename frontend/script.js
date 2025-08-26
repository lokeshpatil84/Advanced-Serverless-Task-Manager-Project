AWS.config.region = 'ap-south-1';

const userPoolId = 'ap-south-1_zrLtOI88d';
const clientId = '7c8hkc4mic14jdjtjrieqm4cvh';
const apiUrl = 'https://3hg3vum988.execute-api.ap-south-1.amazonaws.com/prod/tasks';
const presignedUrlApi = 'https://3hg3vum988.execute-api.ap-south-1.amazonaws.com/prod/presigned';

let idToken = null;

const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'ap-south-1' });

// ===== Alerts =====
function showAlert(message, type) {
    const authMessage = document.getElementById('authMessage');
    authMessage.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// ===== Sign Up =====
async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const response = await cognito.signUp({
            ClientId: clientId,
            Username: email,
            Password: password,
            UserAttributes: [{ Name: 'email', Value: email }]
        }).promise();

        showAlert('Sign up successful! Check email for verification code.', 'success');
        const code = prompt('Enter verification code:');
        if (code) {
            await cognito.confirmSignUp({
                ClientId: clientId,
                Username: email,
                Code: code
            }).promise();
            showAlert('User confirmed! Please sign in.', 'success');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showAlert(error.message, 'danger');
    }
}

// ===== Sign In =====
async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const response = await cognito.initiateAuth({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: clientId,
            AuthParameters: { USERNAME: email, PASSWORD: password }
        }).promise();

        idToken = response.AuthenticationResult.IdToken;
        sessionStorage.setItem('idToken', idToken);

        document.getElementById('auth').style.display = 'none';
        document.getElementById('tasks').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'block';
        showAlert('Signed in successfully!', 'success');

        fetchTasks();

    } catch (error) {
        console.error('Sign in error:', error);
        showAlert(`${error.code || ''}: ${error.message}`, 'danger');
    }
}

// ===== Auto-login on page load =====
window.addEventListener('DOMContentLoaded', () => {
    const storedToken = sessionStorage.getItem('idToken');
    if (storedToken) {
        idToken = storedToken;
        document.getElementById('auth').style.display = 'none';
        document.getElementById('tasks').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'block';
        fetchTasks();
    }
});

// ===== Sign Out =====
function signOut() {
    idToken = null;
    sessionStorage.removeItem('idToken');
    document.getElementById('auth').style.display = 'block';
    document.getElementById('tasks').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'none';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('taskList').getElementsByTagName('tbody')[0].innerHTML = '';
    showAlert('Signed out successfully.', 'success');
}

// ===== Get Pre-signed URL =====
async function getPresignedUrl(fileName) {
    const response = await fetch(presignedUrlApi, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName })
    });
    if (!response.ok) throw new Error(`Failed to get presigned URL: ${response.status}`);
    return await response.json();
}

// ===== Create Task with Optional File =====
async function createTask(event) {
    event.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const fileInput = document.getElementById('taskAttachment');
    let attachmentKey = null;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const presignedData = await getPresignedUrl(file.name);
        attachmentKey = presignedData.objectKey;

        await fetch(presignedData.presignedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });
    }

    const taskResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, attachmentKey })
    });
    const taskData = await taskResponse.json();
    console.log('Task created:', taskData);
    showAlert('Task created successfully!', 'success');
    fetchTasks();
}

// ===== Fetch Tasks =====
async function fetchTasks() {
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
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
            row.insertCell(3).innerHTML = task.attachmentKey
                ? `<a href="https://serverless-task-manager-attachments.s3.ap-south-1.amazonaws.com/${task.attachmentKey}" target="_blank">View</a>`
                : '-';
            row.insertCell(4).innerHTML = `
                <button class="btn btn-sm btn-warning me-1" onclick="updateTask('${task.taskId}', '${task.title.replace(/'/g, "\\'")}')">Update</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.taskId}')">Delete</button>
            `;
        });
    } catch (error) {
        console.error('Fetch tasks error:', error);
        showAlert(error.message, 'danger');
    }
}

// ===== Update Task =====
async function updateTask(taskId, currentTitle) {
    const newTitle = prompt('Enter new title:', currentTitle);
    const newStatus = prompt('Enter new status (pending/completed):', 'pending');
    if (!newTitle || !newStatus) return;

    try {
        const response = await fetch(`${apiUrl}/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
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

// ===== Delete Task =====
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
        const response = await fetch(`${apiUrl}/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to delete task');
        showAlert('Task deleted successfully!', 'success');
        fetchTasks();
    } catch (error) {
        console.error('Delete task error:', error);
        showAlert(error.message, 'danger');
    }
}
