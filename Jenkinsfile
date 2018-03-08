pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install && yarn run build'
        /*sh 'cd stopify-continuations && yarn run test'*/
        sh 'cd stopify && yarn run test:integration'
        /*sh 'cd stopify-module-test && yarn build && yarn test'*/
      }
      post {
        always {
          junit 'stopify/results.xml'
        }
      }
    }
  }
}
