pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        sh 'cd stopify-continuations && yarn run build && yarn run test'
        sh 'cd stopify && yarn run build && yarn run test:integration'
      }
      post {
        always {
          junit 'stopify/results.xml'
        }
      }
    }
  }
}
