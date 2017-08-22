pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        sh 'yarn run test:integration'
      }
    }
  }
  post {
    always {
      junit 'results.xml'
    }
  }
}
