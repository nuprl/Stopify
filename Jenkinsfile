pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        sh 'yarn run build'
        sh 'cd stopify-continuations && yarn run test'
        sh 'cd stopify && yarn run test:integration'
        sh 'cd stopify-module-test && yarn test'
        sh 'yarn unlink stopify'
      }
      post {
        always {
          junit 'stopify/results.xml'
        }
      }
    }
  }
}
