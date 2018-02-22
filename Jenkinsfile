pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        // yarn link is used by stopify-module-test
        sh 'cd stopify-continuations && yarn run build && yarn run test'
        sh 'cd stopify && yarn run build && yarn run test:integration'
        sh 'cd stopify-module-test && yarn build && yarn test'
      }
      post {
        always {
          junit 'stopify/results.xml'
        }
      }
    }
  }
}
