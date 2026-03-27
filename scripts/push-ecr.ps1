param(
    [Parameter(Mandatory = $true)]
    [string]$AwsAccountId,

    [string]$AwsRegion = "us-east-1",
    [string]$RepositoryName = "siteanalyzer-ai",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

$awsCli = Get-Command aws -ErrorAction SilentlyContinue
if ($awsCli) {
    $awsCmd = $awsCli.Source
}
elseif (Test-Path "C:\Program Files\Amazon\AWSCLIV2\aws.exe") {
    $awsCmd = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
}
else {
    throw "AWS CLI was not found. Install AWS CLI or add it to PATH."
}

$repoUri = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/$RepositoryName"
$localImage = "${RepositoryName}:${ImageTag}"
$remoteImage = "${repoUri}:${ImageTag}"

Write-Host "Ensuring ECR repository exists: $RepositoryName" -ForegroundColor Cyan
try {
    & $awsCmd ecr describe-repositories --repository-names $RepositoryName --region $AwsRegion | Out-Null
}
catch {
    & $awsCmd ecr create-repository --repository-name $RepositoryName --region $AwsRegion | Out-Null
}

Write-Host "Logging Docker into ECR: $repoUri" -ForegroundColor Cyan
& $awsCmd ecr get-login-password --region $AwsRegion |
    docker login --username AWS --password-stdin "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

Write-Host "Building Docker image: $localImage" -ForegroundColor Cyan
docker build -t $localImage .

Write-Host "Tagging image: $remoteImage" -ForegroundColor Cyan
docker tag $localImage $remoteImage

Write-Host "Pushing image to ECR: $remoteImage" -ForegroundColor Cyan
docker push $remoteImage

Write-Host "Done. Image available at $remoteImage" -ForegroundColor Green
