pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        nodejs(nodeJSInstallationName: 'node', configId: '') {
          sh 'npm install'
          sh 'npm run test:integration'
        }
      }
    }
  }
}
