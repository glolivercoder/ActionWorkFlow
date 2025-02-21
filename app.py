from flask import Flask, render_template, jsonify, request
import subprocess
import os
import json
import webbrowser
import threading
import time
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Git Settings and User Commands
GIT_SETTINGS = [
    {"name": "List Git Config", "description": "Show all Git configurations", "command": "git config --list", "needs_info": False},
    {"name": "Set Git User", "description": "Set Git username", "command": "git config --global user.name \"{username}\"", "needs_info": True, "params": ["username"]},
    {"name": "Set Git Email", "description": "Set Git email", "command": "git config --global user.email \"{email}\"", "needs_info": True, "params": ["email"]},
    {"name": "GitHub Login", "description": "Login to GitHub CLI", "command": "gh auth login", "needs_info": False},
    {"name": "GitHub Status", "description": "Check GitHub login status", "command": "gh auth status", "needs_info": False},
    {"name": "Switch GitHub User", "description": "Switch GitHub account", "command": "gh auth logout && gh auth login", "needs_info": False}
]

# Git Search and Push Commands
GIT_SEARCH_PUSH = [
    {"name": "List Repositories", "description": "List all repositories", "command": "gh repo list", "needs_info": False},
    {"name": "List Branches", "description": "List all branches", "command": "git branch -a", "needs_info": False},
    {"name": "List Commits", "description": "List recent commits", "command": "git log --oneline", "needs_info": False},
    {"name": "Interactive Push", "description": "Push to selected branch", "command": "git push origin {branch}", "needs_info": True, "params": ["branch"], "interactive": True},
    {"name": "Search Repositories", "description": "Search GitHub repositories", "command": "gh search repos {query}", "needs_info": True, "params": ["query"]},
    {"name": "Jupyter Push", "description": "Push Jupyter changes", "command": "git add *.ipynb && git commit -m \"{message}\" && git push origin {branch}", "needs_info": True, "params": ["message", "branch"]}
]

# Command categories
NODEJS_COMMANDS = [
    {"name": "npm init", "description": "Initialize a new Node.js project", "command": "npm init -y"},
    {"name": "npm install", "description": "Install dependencies", "command": "npm install"},
    {"name": "npm start", "description": "Start the application", "command": "npm start"},
    {"name": "npm run dev", "description": "Run development server", "command": "npm run dev"},
    {"name": "npm test", "description": "Run tests", "command": "npm test"},
    {"name": "npm update", "description": "Update dependencies", "command": "npm update"},
    {"name": "npm audit", "description": "Run security audit", "command": "npm audit"},
    {"name": "npm run build", "description": "Build the project", "command": "npm run build"},
    {"name": "npm list", "description": "List installed packages", "command": "npm list"},
    {"name": "npm version", "description": "Check npm version", "command": "npm -v"}
]

GIT_COMMANDS = [
    {"name": "Git Init", "description": "Initialize repository", "command": "git init", "needs_info": False},
    {"name": "Git Clone", "description": "Clone repository", "command": "git clone {repo_url}", "needs_info": True, "params": ["repo_url"]},
    {"name": "Git Status", "description": "Check status", "command": "git status", "needs_info": False},
    {"name": "Git Add", "description": "Stage changes", "command": "git add .", "needs_info": False},
    {"name": "Git Commit", "description": "Commit changes", "command": "git commit -m \"{message}\"", "needs_info": True, "params": ["message"]},
    {"name": "Git Push", "description": "Push changes", "command": "git push origin {branch}", "needs_info": True, "params": ["branch"]},
    {"name": "Git Pull", "description": "Pull changes", "command": "git pull", "needs_info": False},
    {"name": "Git Branch", "description": "List branches", "command": "git branch", "needs_info": False},
    {"name": "Git Checkout", "description": "Switch branch", "command": "git checkout {branch}", "needs_info": True, "params": ["branch"]},
    {"name": "Git Merge", "description": "Merge branches", "command": "git merge {branch}", "needs_info": True, "params": ["branch"]},
    {"name": "Git Log", "description": "View commit history", "command": "git log", "needs_info": False},
    {"name": "Git Remote", "description": "Show remotes", "command": "git remote -v", "needs_info": False},
    {"name": "Git Fetch", "description": "Fetch changes", "command": "git fetch", "needs_info": False},
    {"name": "Git Reset", "description": "Reset changes", "command": "git reset", "needs_info": False},
    {"name": "Git Stash", "description": "Stash changes", "command": "git stash", "needs_info": False},
    {"name": "Create GitHub Repo", "description": "Create a new GitHub repository", "command": "gh repo create {repo_name} --public", "needs_info": True, "params": ["repo_name"]},
    {"name": "Clone GitHub Repo", "description": "Clone a GitHub repository", "command": "gh repo clone {owner}/{repo_name}", "needs_info": True, "params": ["owner", "repo_name"]},
    {"name": "Fork GitHub Repo", "description": "Fork a GitHub repository", "command": "gh repo fork {owner}/{repo_name}", "needs_info": True, "params": ["owner", "repo_name"]},
    {"name": "View GitHub Repo", "description": "View repository details", "command": "gh repo view {owner}/{repo_name}", "needs_info": True, "params": ["owner", "repo_name"]}
]

DOCKER_COMMANDS = [
    {"name": "Docker PS", "description": "List containers", "command": "docker ps"},
    {"name": "Docker Images", "description": "List images", "command": "docker images"},
    {"name": "Docker Pull", "description": "Pull image", "command": "docker pull {image}"},
    {"name": "Docker Run", "description": "Run container", "command": "docker run {image}"},
    {"name": "Docker Stop", "description": "Stop container", "command": "docker stop {container}"},
    {"name": "Docker Remove", "description": "Remove container", "command": "docker rm {container}"},
    {"name": "Docker Build", "description": "Build image", "command": "docker build -t {name} ."},
    {"name": "Docker Exec", "description": "Execute command", "command": "docker exec -it {container} {command}"},
    {"name": "Docker Logs", "description": "View logs", "command": "docker logs {container}"},
    {"name": "Docker Network", "description": "List networks", "command": "docker network ls"},
    {"name": "Docker Volume", "description": "List volumes", "command": "docker volume ls"},
    {"name": "Docker Compose Up", "description": "Start services", "command": "docker-compose up"},
    {"name": "Docker Compose Down", "description": "Stop services", "command": "docker-compose down"},
    {"name": "Docker System Prune", "description": "Clean unused data", "command": "docker system prune"},
    {"name": "Docker Info", "description": "System info", "command": "docker info"},
    {"name": "Docker Version", "description": "Show version", "command": "docker version"},
    {"name": "Docker Stats", "description": "Container stats", "command": "docker stats"},
    {"name": "Docker Inspect", "description": "Inspect container", "command": "docker inspect {container}"},
    {"name": "Docker Top", "description": "Show processes", "command": "docker top {container}"},
    {"name": "Docker Save", "description": "Save image", "command": "docker save {image} > {filename}.tar"}
]

# Jupyter Notebook Commands
JUPYTER_COMMANDS = [
    {"name": "Push Notebook", "description": "Push Jupyter notebook to GitHub", "command": "git add *.ipynb && git commit -m \"{message}\" && git push origin {branch}", "needs_info": True, "params": ["message", "branch"], "interactive": True},
    {"name": "List Notebooks", "description": "List all Jupyter notebooks", "command": "ls *.ipynb", "needs_info": False},
    {"name": "Clear Notebook Output", "description": "Clear output cells from notebook", "command": "jupyter nbconvert --clear-output --inplace {notebook}", "needs_info": True, "params": ["notebook"]},
    {"name": "Convert to HTML", "description": "Convert notebook to HTML", "command": "jupyter nbconvert --to html {notebook}", "needs_info": True, "params": ["notebook"]},
    {"name": "Git LFS Track", "description": "Track Jupyter notebooks with Git LFS", "command": "git lfs track \"*.ipynb\"", "needs_info": False},
    {"name": "Notebook Status", "description": "Check status of notebook files", "command": "git status *.ipynb", "needs_info": False}
]

# Deployment Commands
DEPLOY_GITHUB_COMMANDS = [
    {"name": "Deploy to Cloudflare", "description": "Deploy to Cloudflare Pages", "command": "gh workflow run cloudflare-deploy.yml --ref {branch}", "needs_info": True, "params": ["branch"], "interactive": True},
    {"name": "Deploy to Jupyter", "description": "Deploy to JupyterHub", "command": "jupyter-repo-push {repo_url} {branch} {message}", "needs_info": True, "params": ["repo_url", "branch", "message"], "interactive": True},
    {"name": "Setup Cloudflare", "description": "Setup Cloudflare Pages project", "command": "wrangler pages project create {project_name} --production-branch {branch}", "needs_info": True, "params": ["project_name", "branch"]},
    {"name": "Deploy Custom", "description": "Deploy to custom VPS", "command": "ssh {user}@{host} 'cd {path} && git pull origin {branch}'", "needs_info": True, "params": ["user", "host", "path", "branch"]}
]

DEPLOY_DOCKER_COMMANDS = [
    {"name": "Build and Push", "description": "Build and push Docker image", "command": "docker build -t {image_name} . && docker push {image_name}", "needs_info": True, "params": ["image_name"]},
    {"name": "Deploy Container", "description": "Deploy Docker container", "command": "docker-compose -f {compose_file} up -d", "needs_info": True, "params": ["compose_file"]},
    {"name": "Deploy to Swarm", "description": "Deploy to Docker Swarm", "command": "docker stack deploy -c {compose_file} {stack_name}", "needs_info": True, "params": ["compose_file", "stack_name"]},
    {"name": "Deploy to K8s", "description": "Deploy to Kubernetes", "command": "kubectl apply -f {k8s_file}", "needs_info": True, "params": ["k8s_file"]}
]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/commands/<category>')
def get_commands(category):
    if category == 'jupyter':
        return jsonify(JUPYTER_COMMANDS)
    elif category == 'nodejs':
        return jsonify(NODEJS_COMMANDS)
    elif category == 'git':
        return jsonify(GIT_COMMANDS)
    elif category == 'docker':
        return jsonify(DOCKER_COMMANDS)
    elif category == 'git_settings':
        return jsonify(GIT_SETTINGS)
    elif category == 'git_search_push':
        return jsonify(GIT_SEARCH_PUSH)
    elif category == 'deploy_github':
        return jsonify(DEPLOY_GITHUB_COMMANDS)
    elif category == 'deploy_docker':
        return jsonify(DEPLOY_DOCKER_COMMANDS)
    return jsonify([])

@app.route('/api/git/search', methods=['POST'])
def git_search():
    data = request.json
    search_type = data.get('type')
    query = data.get('query', '')

    try:
        if search_type == 'repos':
            result = subprocess.run(['gh', 'repo', 'list', '--json', 'name,description,url', '--search', query], 
                                 capture_output=True, text=True)
        elif search_type == 'branches':
            result = subprocess.run(['git', 'branch', '-a', '--list', f'*{query}*'],
                                 capture_output=True, text=True)
        elif search_type == 'commits':
            result = subprocess.run(['git', 'log', '--oneline', '--grep', query],
                                 capture_output=True, text=True)
        else:
            return jsonify({'success': False, 'error': 'Invalid search type'})

        return jsonify({
            'success': True,
            'output': result.stdout,
            'error': result.stderr
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/execute', methods=['POST'])
def execute_command():
    data = request.json
    command = data.get('command')

    if command == 'exit':
        # Clean exit of the application
        func = request.environ.get('werkzeug.server.shutdown')
        if func is None:
            sys.exit()
        func()
        return jsonify({'success': True})

    try:
        # Check if gh CLI is installed
        if command.startswith('gh '):
            try:
                subprocess.run(['gh', '--version'], capture_output=True, text=True)
            except FileNotFoundError:
                return jsonify({
                    'success': False,
                    'error': 'GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com/'
                })

        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return jsonify({
            'success': True,
            'output': result.stdout,
            'error': result.stderr
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

def open_browser():
    """Open the browser after a short delay"""
    time.sleep(1.5)
    webbrowser.open('http://127.0.0.1:5000/')

if __name__ == '__main__':
    # Start the browser in a new thread
    threading.Thread(target=open_browser).start()
    
    # Start the Flask application
    app.run(debug=False) 