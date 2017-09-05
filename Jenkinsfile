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
        sh 'cd /mnt/homes/jenkins'
        checkout scm
        sh 'cd Stopify'
        sh 'git clone https://github.com/plasma-umass/stopify-benchmarks.git'
        sh 'yarn install'
        sh 'yarn run build'
        sh 'yarn run bench'
        archive 'perf/*.csv'
      }
    }
  }
}
