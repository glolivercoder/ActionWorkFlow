document.addEventListener('DOMContentLoaded', () => {
    // Window control elements
    const appWindow = document.getElementById('appWindow');
    const pinButton = document.getElementById('pinButton');
    const closeButton = document.getElementById('closeButton');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Show app window initially
    appWindow.style.display = 'block';
    
    // Window control handlers
    pinButton.addEventListener('click', () => {
        pinButton.classList.toggle('pinned');
        appWindow.classList.toggle('pinned');
    });

    closeButton.addEventListener('click', async () => {
        try {
            await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: 'exit' })
            });
            window.close();
        } catch (error) {
            console.error('Error closing application:', error);
        }
    });

    // Window dragging functionality
    appWindow.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.closest('.category-content') || e.target.closest('.modal')) {
            return;
        }
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === appWindow || e.target.closest('.header-actions') || e.target.closest('.title-container')) {
            isDragging = true;
            appWindow.classList.add('dragging');
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, appWindow);
        }
    }

    function dragEnd() {
        isDragging = false;
        appWindow.classList.remove('dragging');
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    // Initialize UI elements
    const categories = document.querySelectorAll('.category');
    const modalOverlay = document.querySelector('.modal-overlay');
    const paramModal = document.getElementById('paramModal');
    const addCommandModal = document.getElementById('addCommandModal');
    const importModal = document.getElementById('importModal');
    const themeModal = document.getElementById('themeModal');
    const gitUsersModal = document.getElementById('gitUsersModal');
    const executeButton = document.getElementById('executeCommand');
    const importButton = document.querySelector('.import-btn');
    const addCategoryButton = document.querySelector('.add-category');
    let currentCommand = null;
    let currentCategory = null;

    // Hide all modals initially
    function hideAllModals() {
        const modals = [paramModal, addCommandModal, importModal, themeModal, gitUsersModal];
        modalOverlay.classList.remove('show');
        modals.forEach(modal => {
            if (modal) {
                modal.classList.remove('show');
                // Wait for animation to complete before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            }
        });
        setTimeout(() => {
            modalOverlay.style.display = 'none';
        }, 200);
    }

    // Show modal with overlay and animation
    function showModal(modal) {
        if (modal) {
            modalOverlay.style.display = 'block';
            modal.style.display = 'block';
            // Trigger reflow
            modal.offsetHeight;
            modalOverlay.classList.add('show');
            modal.classList.add('show');
        }
    }

    // Handle escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });

    // Prevent modal click from closing
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Setup category handlers
    function initializeCategories() {
        const categories = document.querySelectorAll('.category');
        
        categories.forEach(category => {
            const categoryName = category.dataset.category;
            const header = category.querySelector('.category-header');
            const addCommandBtn = category.querySelector('.add-command');
            const addServerBtn = category.querySelector('.add-server');
            const content = category.querySelector('.category-content');

            // Load initial commands
            loadCommands(categoryName, content);

            // Category header click handler
            header.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.add-command') || 
                    e.target.closest('.add-server') || 
                    e.target.closest('.info-icon')) {
                    return;
                }

                // Close all other categories
                categories.forEach(otherCategory => {
                    if (otherCategory !== category) {
                        otherCategory.classList.remove('active');
                        const otherIcon = otherCategory.querySelector('.toggle-icon');
                        if (otherIcon) {
                            otherIcon.style.transform = 'rotate(0deg)';
                        }
                    }
                });

                // Toggle current category
                category.classList.toggle('active');
                const icon = category.querySelector('.toggle-icon');
                if (icon) {
                    icon.style.transform = category.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });

            // Add command button handler
            if (addCommandBtn) {
                addCommandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentCategory = categoryName;
                    showModal(addCommandModal);
                });
            }

            // Add server button handler
            if (addServerBtn) {
                addServerBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentCategory = categoryName;
                    showModal(addServerModal);
                    const serverTypeSelect = document.getElementById('serverType');
                    if (serverTypeSelect) {
                        updateCredentialsFields(serverTypeSelect.value);
                    }
                });
            }
        });
    }

    // Theme handling
    const settingsButton = document.getElementById('settingsButton');
    const closeThemeModal = document.getElementById('closeThemeModal');
    const themeButtons = document.querySelectorAll('.theme-btn');

    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showModal(themeModal);
    });

    closeThemeModal.addEventListener('click', hideAllModals);

    // Git Users handling
    const manageGitUsers = document.getElementById('manageGitUsers');
    const closeGitUsers = document.getElementById('closeGitUsers');

    if (manageGitUsers) {
        manageGitUsers.addEventListener('click', (e) => {
            e.stopPropagation();
            showModal(gitUsersModal);
            loadGitUsers();
        });
    }

    if (closeGitUsers) {
        closeGitUsers.addEventListener('click', hideAllModals);
    }

    // Import button
    importButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showModal(importModal);
    });

    // Add category button
    addCategoryButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryName = prompt('Enter category name:');
        if (categoryName) {
            addNewCategory(categoryName);
        }
    });

    // Execute command button handler
    executeButton.addEventListener('click', () => {
        if (!currentCommand) return;

        const params = {};
        document.querySelectorAll('#paramFields input').forEach(input => {
            params[input.name] = input.value;
        });

        let finalCommand = currentCommand;
        Object.entries(params).forEach(([key, value]) => {
            finalCommand = finalCommand.replace(`{${key}}`, value);
        });

        executeCommand(finalCommand);
        hideAllModals();
    });

    // Save command handler
    document.getElementById('saveCommand').addEventListener('click', () => {
        const name = document.getElementById('cmdName').value;
        const description = document.getElementById('cmdDescription').value;
        const command = document.getElementById('cmdCommand').value;

        if (name && description && command) {
            const newCommand = { name, description, command };
            addCommandToCategory(currentCategory, newCommand);
            hideAllModals();
            clearAddCommandForm();
        }
    });

    // Helper functions
    async function loadCommands(category, container) {
        try {
            const response = await fetch(`/api/commands/${category}`);
            const commands = await response.json();

            container.innerHTML = commands.map(cmd => `
                <div class="command-item">
                    <div class="command-name">
                        ${cmd.name}
                        ${cmd.needs_info ? '<i class="fas fa-info-circle info-icon" title="Requires additional information"></i>' : ''}
                    </div>
                    <div class="command-description">${cmd.description}</div>
                    <div class="command-text">${cmd.command}</div>
                    <div class="command-actions">
                        <i class="fas fa-play action-icon" title="Execute" data-command="${cmd.command}" data-needs-info="${cmd.needs_info}" ${cmd.params ? `data-params='${JSON.stringify(cmd.params)}'` : ''}></i>
                        <i class="fas fa-copy action-icon" title="Copy" data-command="${cmd.command}"></i>
                        <i class="fas fa-edit action-icon" title="Edit"></i>
                        <i class="fas fa-trash action-icon" title="Delete"></i>
                    </div>
                </div>
            `).join('');

            // Add event listeners for command actions
            container.querySelectorAll('.action-icon').forEach(icon => {
                icon.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const command = e.target.dataset.command;
                    const needsInfo = e.target.dataset.needsInfo === 'true';
                    const params = e.target.dataset.params ? JSON.parse(e.target.dataset.params) : null;
                    
                    if (e.target.classList.contains('fa-play')) {
                        if (needsInfo && params) {
                            await handleInteractiveCommand(command, params);
                        } else {
                            handleCommandExecution(command);
                        }
                    } else if (e.target.classList.contains('fa-copy')) {
                        navigator.clipboard.writeText(command);
                        showNotification('Command copied to clipboard!');
                    } else if (e.target.classList.contains('fa-trash')) {
                        if (confirm('Are you sure you want to delete this command?')) {
                            e.target.closest('.command-item').remove();
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    function handleCommandExecution(command) {
        if (command.includes('{')) {
            currentCommand = command;
            showParamModal(command);
        } else {
            executeCommand(command);
        }
    }

    function showParamModal(command) {
        const paramFields = document.getElementById('paramFields');
        const params = [...command.matchAll(/{([^}]+)}/g)].map(match => match[1]);
        
        paramFields.innerHTML = params.map(param => `
            <div class="form-group">
                <label for="${param}">${param}:</label>
                <input type="text" name="${param}" id="${param}" required>
            </div>
        `).join('');
        
        showModal(paramModal);
    }

    async function executeCommand(command) {
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Command executed successfully!');
                if (result.output) {
                    console.log('Command output:', result.output);
                }
            } else {
                showNotification('Error executing command: ' + result.error, 'error');
            }
        } catch (error) {
            showNotification('Error executing command: ' + error, 'error');
        }
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function clearAddCommandForm() {
        document.getElementById('cmdName').value = '';
        document.getElementById('cmdDescription').value = '';
        document.getElementById('cmdCommand').value = '';
    }

    function addCommandToCategory(category, command) {
        const container = document.querySelector(`[data-category="${category}"] .category-content`);
        const commandElement = document.createElement('div');
        commandElement.className = 'command-item';
        commandElement.innerHTML = `
            <div class="command-name">${command.name}</div>
            <div class="command-description">${command.description}</div>
            <div class="command-text">${command.command}</div>
            <div class="command-actions">
                <i class="fas fa-play action-icon" title="Execute" data-command="${command.command}"></i>
                <i class="fas fa-copy action-icon" title="Copy" data-command="${command.command}"></i>
                <i class="fas fa-edit action-icon" title="Edit"></i>
                <i class="fas fa-trash action-icon" title="Delete"></i>
            </div>
        `;
        container.appendChild(commandElement);

        // Add event listeners for the new command's actions
        commandElement.querySelectorAll('.action-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const cmd = e.target.dataset.command;
                
                if (e.target.classList.contains('fa-play')) {
                    handleCommandExecution(cmd);
                } else if (e.target.classList.contains('fa-copy')) {
                    navigator.clipboard.writeText(cmd);
                    showNotification('Command copied to clipboard!');
                } else if (e.target.classList.contains('fa-trash')) {
                    if (confirm('Are you sure you want to delete this command?')) {
                        e.target.closest('.command-item').remove();
                    }
                }
            });
        });
    }

    function addNewCategory(name) {
        const category = document.createElement('div');
        category.className = 'category';
        category.dataset.category = name.toLowerCase();
        category.innerHTML = `
            <div class="category-header">
                <h2>${name}</h2>
                <div class="category-actions">
                    <i class="fas fa-plus-circle add-command" title="Add Command"></i>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
            </div>
            <div class="category-content"></div>
        `;
        
        document.querySelector('.categories').appendChild(category);
        
        // Add event listeners to new category
        const header = category.querySelector('.category-header');
        const addCommandBtn = category.querySelector('.add-command');
        
        header.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-command')) {
                e.stopPropagation();
                category.classList.toggle('active');
                const icon = category.querySelector('.toggle-icon');
                icon.style.transform = category.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });

        addCommandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentCategory = name.toLowerCase();
            showModal(addCommandModal);
        });
    }

    async function handleInteractiveCommand(command, params) {
        const values = {};
        
        // Create and show the interactive dialog
        const dialog = document.createElement('div');
        dialog.className = 'interactive-dialog';
        dialog.innerHTML = `
            <h2>Enter Required Information</h2>
            <form id="paramForm">
                ${params.map(param => `
                    <div class="form-group">
                        <label for="${param}">${formatParamLabel(param)}:</label>
                        <input type="text" id="${param}" name="${param}" required>
                    </div>
                `).join('')}
                <div class="dialog-buttons">
                    <button type="submit" class="primary">Execute</button>
                    <button type="button" class="secondary">Cancel</button>
                </div>
            </form>
        `;

        document.body.appendChild(dialog);

        // Handle form submission
        const form = dialog.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            params.forEach(param => {
                values[param] = form.elements[param].value;
            });

            let finalCommand = command;
            Object.entries(values).forEach(([key, value]) => {
                finalCommand = finalCommand.replace(`{${key}}`, value);
            });

            dialog.remove();
            await executeCommand(finalCommand);
        });

        // Handle cancel button
        dialog.querySelector('button.secondary').addEventListener('click', () => {
            dialog.remove();
        });
    }

    function formatParamLabel(param) {
        return param
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Theme handling
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            applyTheme(theme);
            
            // Update active state
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Save theme preference
            localStorage.setItem('preferred-theme', theme);
        });
    });

    function applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme.includes('dark')) {
            const color = theme.split('-')[0];
            root.style.setProperty('--primary-color', `var(--${color}-dark-primary)`);
            root.style.setProperty('--secondary-color', `var(--${color}-dark-secondary)`);
            root.style.setProperty('--background-color', `var(--${color}-dark-bg)`);
            root.style.setProperty('--card-background', `var(--${color}-dark-card)`);
            root.style.setProperty('--text-color', `var(--${color}-dark-text)`);
        } else {
            const color = theme.split('-')[0];
            root.style.setProperty('--primary-color', `var(--${color}-light-primary)`);
            root.style.setProperty('--secondary-color', `var(--${color}-light-secondary)`);
            root.style.setProperty('--background-color', `var(--${color}-light-bg)`);
            root.style.setProperty('--card-background', `var(--${color}-light-card)`);
            root.style.setProperty('--text-color', `var(--${color}-light-text)`);
        }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
        document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');
    }

    // Git user management
    const saveGitUser = document.getElementById('saveGitUser');
    const gitUsersList = document.querySelector('.git-users-list');

    if (saveGitUser) {
        saveGitUser.addEventListener('click', async () => {
            const username = document.getElementById('gitUsername').value;
            const email = document.getElementById('gitEmail').value;
            
            if (username && email) {
                try {
                    await executeCommand(`git config --global user.name "${username}"`);
                    await executeCommand(`git config --global user.email "${email}"`);
                    showNotification('Git user settings saved successfully!');
                    loadGitUsers();
                    document.getElementById('gitUsername').value = '';
                    document.getElementById('gitEmail').value = '';
                } catch (error) {
                    showNotification('Error saving Git user settings', 'error');
                }
            }
        });
    }

    async function loadGitUsers() {
        try {
            const nameResult = await executeCommand('git config --global user.name');
            const emailResult = await executeCommand('git config --global user.email');
            
            const username = nameResult.output.trim();
            const email = emailResult.output.trim();
            
            gitUsersList.innerHTML = `
                <div class="git-user-item">
                    <div class="git-user-info">
                        <div>${username}</div>
                        <div>${email}</div>
                    </div>
                    <div class="git-user-actions">
                        <i class="fas fa-edit action-icon" title="Edit"></i>
                        <i class="fas fa-trash action-icon" title="Delete"></i>
                    </div>
                </div>
            `;
            
            // Add event listeners for edit and delete actions
            gitUsersList.querySelectorAll('.action-icon').forEach(icon => {
                icon.addEventListener('click', async (e) => {
                    const userItem = e.target.closest('.git-user-item');
                    const userInfo = userItem.querySelector('.git-user-info');
                    
                    if (e.target.classList.contains('fa-edit')) {
                        document.getElementById('gitUsername').value = userInfo.children[0].textContent;
                        document.getElementById('gitEmail').value = userInfo.children[1].textContent;
                    } else if (e.target.classList.contains('fa-trash')) {
                        if (confirm('Are you sure you want to remove this Git user?')) {
                            await executeCommand('git config --global --unset user.name');
                            await executeCommand('git config --global --unset user.email');
                            showNotification('Git user removed successfully!');
                            loadGitUsers();
                        }
                    }
                });
            });
        } catch (error) {
            showNotification('Error loading Git users', 'error');
        }
    }

    // Server management
    function initializeServerManagement() {
        const addServerButtons = document.querySelectorAll('.add-server');
        const addServerModal = document.getElementById('addServerModal');
        const serverTypeSelect = document.getElementById('serverType');
        const credentialsGroup = document.querySelector('.credentials-group');
        const saveServerButton = document.getElementById('saveServer');
        const cancelServerButton = document.getElementById('cancelServer');
        
        let currentCategory = null;

        // Show server modal
        addServerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                currentCategory = e.target.closest('.category').dataset.category;
                showModal(addServerModal);
                updateCredentialsFields(serverTypeSelect.value);
            });
        });

        // Update credentials fields based on server type
        serverTypeSelect.addEventListener('change', () => {
            updateCredentialsFields(serverTypeSelect.value);
        });

        function updateCredentialsFields(serverType) {
            let fields = '';
            switch (serverType) {
                case 'cloudflare':
                    fields = `
                        <div class="form-group">
                            <label for="accountId">Account ID:</label>
                            <input type="text" id="accountId" required>
                        </div>
                        <div class="form-group">
                            <label for="apiToken">API Token:</label>
                            <input type="password" id="apiToken" required>
                        </div>
                    `;
                    break;
                case 'jupyter':
                    fields = `
                        <div class="form-group">
                            <label for="jupyterToken">Jupyter Token:</label>
                            <input type="password" id="jupyterToken" required>
                        </div>
                        <div class="form-group">
                            <label for="jupyterUrl">Jupyter URL:</label>
                            <input type="text" id="jupyterUrl" required>
                        </div>
                    `;
                    break;
                case 'custom':
                    fields = `
                        <div class="form-group">
                            <label for="sshKey">SSH Key Path:</label>
                            <input type="text" id="sshKey" required>
                        </div>
                        <div class="form-group">
                            <label for="username">Username:</label>
                            <input type="text" id="username" required>
                        </div>
                    `;
                    break;
            }
            credentialsGroup.innerHTML = fields;
        }

        // Save server configuration
        saveServerButton.addEventListener('click', () => {
            const serverData = {
                type: serverTypeSelect.value,
                name: document.getElementById('serverName').value,
                url: document.getElementById('serverUrl').value,
                credentials: {}
            };

            // Collect credentials based on server type
            const credentialInputs = credentialsGroup.querySelectorAll('input');
            credentialInputs.forEach(input => {
                serverData.credentials[input.id] = input.value;
            });

            // Save server configuration
            saveServerConfiguration(currentCategory, serverData);
            hideAllModals();
            clearServerForm();
        });

        // Cancel button
        cancelServerButton.addEventListener('click', () => {
            hideAllModals();
            clearServerForm();
        });

        function clearServerForm() {
            document.getElementById('serverName').value = '';
            document.getElementById('serverUrl').value = '';
            serverTypeSelect.value = 'cloudflare';
            updateCredentialsFields('cloudflare');
        }

        function saveServerConfiguration(category, serverData) {
            // Get existing servers or initialize empty array
            const servers = JSON.parse(localStorage.getItem(`${category}_servers`) || '[]');
            
            // Add new server
            servers.push(serverData);
            
            // Save to localStorage
            localStorage.setItem(`${category}_servers`, JSON.stringify(servers));
            
            // Refresh the server list in the UI
            loadServers(category);
        }

        function loadServers(category) {
            const servers = JSON.parse(localStorage.getItem(`${category}_servers`) || '[]');
            const container = document.querySelector(`[data-category="${category}"] .category-content`);
            
            if (servers.length === 0) {
                container.innerHTML = '<div class="no-servers">No servers configured</div>';
                return;
            }

            container.innerHTML = servers.map((server, index) => `
                <div class="server-item">
                    <div class="server-info">
                        <div class="server-name">${server.name}</div>
                        <div class="server-url">${server.url}</div>
                        <div class="server-type">${server.type}</div>
                    </div>
                    <div class="server-actions">
                        <i class="fas fa-edit action-icon" title="Edit" data-index="${index}"></i>
                        <i class="fas fa-trash action-icon" title="Delete" data-index="${index}"></i>
                    </div>
                </div>
            `).join('');

            // Add event listeners for server actions
            container.querySelectorAll('.action-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = e.target.dataset.index;
                    
                    if (e.target.classList.contains('fa-edit')) {
                        editServer(category, index);
                    } else if (e.target.classList.contains('fa-trash')) {
                        deleteServer(category, index);
                    }
                });
            });
        }

        function editServer(category, index) {
            const servers = JSON.parse(localStorage.getItem(`${category}_servers`) || '[]');
            const server = servers[index];
            
            if (server) {
                currentCategory = category;
                serverTypeSelect.value = server.type;
                document.getElementById('serverName').value = server.name;
                document.getElementById('serverUrl').value = server.url;
                
                updateCredentialsFields(server.type);
                
                // Fill in credentials
                Object.entries(server.credentials).forEach(([key, value]) => {
                    const input = document.getElementById(key);
                    if (input) {
                        input.value = value;
                    }
                });
                
                showModal(addServerModal);
            }
        }

        function deleteServer(category, index) {
            if (confirm('Are you sure you want to delete this server?')) {
                const servers = JSON.parse(localStorage.getItem(`${category}_servers`) || '[]');
                servers.splice(index, 1);
                localStorage.setItem(`${category}_servers`, JSON.stringify(servers));
                loadServers(category);
            }
        }

        // Load initial servers for each category
        document.querySelectorAll('[data-category^="deploy_"]').forEach(category => {
            loadServers(category.dataset.category);
        });
    }

    // Initialize all components
    initializeCategories();
    initializeServerManagement();
    initializeThemeHandling();
    initializeGitUsers();

    // Modal overlay click handler
    modalOverlay.addEventListener('click', hideAllModals);
});

// Theme handling initialization
function initializeThemeHandling() {
    const settingsButton = document.getElementById('settingsButton');
    const closeThemeModal = document.getElementById('closeThemeModal');
    const themeButtons = document.querySelectorAll('.theme-btn');

    if (settingsButton) {
        settingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showModal(themeModal);
        });
    }

    if (closeThemeModal) {
        closeThemeModal.addEventListener('click', hideAllModals);
    }

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            applyTheme(theme);
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            localStorage.setItem('preferred-theme', theme);
        });
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
        document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');
    }
}

// Git users initialization
function initializeGitUsers() {
    const manageGitUsers = document.getElementById('manageGitUsers');
    const closeGitUsers = document.getElementById('closeGitUsers');
    const saveGitUser = document.getElementById('saveGitUser');

    if (manageGitUsers) {
        manageGitUsers.addEventListener('click', (e) => {
            e.stopPropagation();
            showModal(gitUsersModal);
            loadGitUsers();
        });
    }

    if (closeGitUsers) {
        closeGitUsers.addEventListener('click', hideAllModals);
    }

    if (saveGitUser) {
        saveGitUser.addEventListener('click', async () => {
            const username = document.getElementById('gitUsername').value;
            const email = document.getElementById('gitEmail').value;
            
            if (username && email) {
                try {
                    await executeCommand(`git config --global user.name "${username}"`);
                    await executeCommand(`git config --global user.email "${email}"`);
                    showNotification('Git user settings saved successfully!');
                    loadGitUsers();
                    document.getElementById('gitUsername').value = '';
                    document.getElementById('gitEmail').value = '';
                } catch (error) {
                    showNotification('Error saving Git user settings', 'error');
                }
            }
        });
    }
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 0.8rem 1.5rem;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-size: 0.9rem;
    }
    
    .notification.success {
        background-color: #00ff9d;
    }
    
    .notification.error {
        background-color: #ff0055;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.3rem;
        color: var(--primary-color);
    }

    .form-group input {
        width: 100%;
        padding: 0.5rem;
        background: #2a2a2a;
        border: 1px solid var(--primary-color);
        color: var(--text-color);
        border-radius: 3px;
    }

    button {
        width: 100%;
        padding: 0.8rem;
        background: transparent;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    button:hover {
        background: var(--primary-color);
        color: var(--background-color);
    }

    .interactive-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--card-background);
        padding: 2rem;
        border-radius: 10px;
        border: 1px solid var(--primary-color);
        box-shadow: var(--border-glow);
        z-index: 1100;
        width: 90%;
        max-width: 400px;
    }

    .interactive-dialog h2 {
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
    }

    .dialog-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .dialog-buttons button {
        flex: 1;
        padding: 0.8rem;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .dialog-buttons button.primary {
        background: var(--primary-color);
        color: var(--background-color);
        border: none;
    }

    .dialog-buttons button.secondary {
        background: transparent;
        color: var(--primary-color);
        border: 1px solid var(--primary-color);
    }

    .info-icon {
        color: var(--primary-color);
        margin-left: 0.5rem;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style); 