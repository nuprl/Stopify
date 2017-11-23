#!/bin/bash
set -e
set -x
BUCKET=`jq -r .output-bucket $DIR/../config.json`
gsutil mb -c Regional -l us-central1 gs://$BUCKET
gsutil defacl ch -u AllUsers:R gs://$BUCKET
