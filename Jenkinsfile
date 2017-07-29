pipeline {
  agent any

  tools {
    nodejs 'node'
  }
  stages {
    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm run test:integration'
      }
    }
  }
}
