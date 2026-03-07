$credPair = "admin:heE2CBqgdUUCSwlutEUb"
$encodedCredentials = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($credPair))
$headers = @{ Authorization = "Basic $encodedCredentials" }
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8081/wp-json/wp/v2/users/me" -Method Get -Headers $headers
    $response | ConvertTo-Json | Out-File -FilePath "$pwd\wp_test.json" -Encoding utf8
    Write-Host "Success"
} catch {
    $_.Exception.Response | Out-File -FilePath "$pwd\wp_test_error.txt" -Encoding utf8
    Write-Host "Failed: $_"
}
