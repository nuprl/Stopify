pipeline {
  agent any

  tools {
    nodejs 'node'
  }
  stages {
    stage('Test') {
      steps {
        sh 'rm -r node_modules package-lock.json || true'
        sh 'npm install'
        sh 'npm run test:integration'
      }
    }
  }
}
