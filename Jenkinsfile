pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'yarn install'
        sh 'yarn run test:integration'
      }
      post {
        always {
          junit 'results.xml'
        }
      }
    }
    stage('Benchmark') {
      when {
        expression {
          currentBuild.result == null || currentBuild.result == 'SUCCESS'
        }
      }
      steps {
        echo '${env.BRANCH_NAME}'
          sh 'yarn run bench'
      }
    }
  }
}
