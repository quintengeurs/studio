$gitPath = "C:\Users\quinten\AppData\Local\GitHubDesktop\app-3.5.7\resources\app\git\cmd\git.exe"
& $gitPath init
& $gitPath add .
& $gitPath commit -m "Initial commit"
& $gitPath branch -M main
& $gitPath remote add origin https://github.com/quintengeurs/studio.git
& $gitPath push -u origin main
