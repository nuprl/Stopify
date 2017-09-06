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
          (currentBuild.result == null || currentBuild.result == 'SUCCESS') &&
          env.BRANCH_NAME ==~ /PR-.*/
        }
      }
      steps {
        sh 'rm -rf benchmarks'
        sh 'git clone https://github.com/plasma-umass/stopify-benchmarks.git benchmarks'
        sh 'yarn run bench'
        archive 'perf/*.csv'
      }
    }
  }
}
