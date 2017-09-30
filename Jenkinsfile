pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        sh 'cd stopify && yarn run test:integration'
      }
      post {
        always {
          junit 'stopify/results.xml'
        }
      }
    }
  }
}
