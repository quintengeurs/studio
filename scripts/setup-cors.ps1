# Firebase Storage CORS Setup Script
# This script applies the necessary CORS configuration to your Firebase Storage bucket
# to allow image uploads from your web application.

$corsJson = @'
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
'@

$bucketName = "gs://studio-4537887383-23869.appspot.com"
$tempFile = "cors_config.json"

Write-Host "Creating temporary CORS configuration file..." -ForegroundColor Cyan
$corsJson | Out-File -FilePath $tempFile -Encoding utf8

Write-Host "Checking for gsutil..." -ForegroundColor Cyan
if (Get-Command gsutil -ErrorAction SilentlyContinue) {
    Write-Host "Applying CORS configuration to $bucketName..." -ForegroundColor Green
    gsutil cors set $tempFile $bucketName
    Write-Host "CORS configuration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: 'gsutil' (Google Cloud SDK) is not installed on this machine." -ForegroundColor Red
    Write-Host "Please install the Google Cloud CLI from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Alternatively, you can run this command in your local terminal if you have the SDK installed:" -ForegroundColor White
    Write-Host "gsutil cors set cors_config.json $bucketName" -ForegroundColor Cyan
}

# Cleanup
if (Test-Path $tempFile) {
    Remove-Item $tempFile
}

Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
