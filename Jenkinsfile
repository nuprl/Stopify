pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm run test:integration'
      }
    }
  }
  post {
    always {
      junit 'results.xml'
    }
  }
}
