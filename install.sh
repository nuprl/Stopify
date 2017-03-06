mkdir -p target
babel --presets es2015 --source-maps inline -d target src
browserify -o target/index.js target/main.js
