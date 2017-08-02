pipeline {
  agent any

  tools {
    nodejs 'node'
  }
  stages {
    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm run test:integration -- --reporter xunit --reporter-options output=results.xml'
        sh 'npm unlink'
      }
    }
  }
  post {
    always {
      junit 'results.xml'
    }
  }
}
