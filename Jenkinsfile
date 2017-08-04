pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm run test:integration -- --reporter xunit --reporter-options output=results.xml'
      }
    }
  }
  post {
    always {
      junit 'results.xml'
    }
  }
}
