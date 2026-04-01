# Fix Next.js 15 params for dynamic routes
$ErrorActionPreference = 'Stop'

$replacements = @(
    @{
        File = 'app\api\properties\[id]\route.ts'
        Old = 'const id = parseInt(params.id);'
        New = 'const { id: paramId } = await params;`n    const id = parseInt(paramId);'
    },
    @{
        File = 'app\api\reviews\[id]\route.ts'
        Old = 'const reviewId = parseInt(params.id);'
        New = 'const { id } = await params;`n    const reviewId = parseInt(id);'
    },
    @{
        File = 'app\api\maintenance\[id]\route.ts'
        Old = 'const taskId = parseInt(params.id);'
        New = 'const { id } = await params;`n    const taskId = parseInt(id);'
    },
    @{
        File = 'app\api\video\[filename]\route.ts'
        Old = 'const { filename } = params;'
        New = 'const { filename } = await params;'
    }
)

foreach ($r in $replacements) {
    try {
        $content = Get-Content $r.File -Raw -ErrorAction Stop
        if ($content -match [regex]::Escape($r.Old)) {
            $content = $content.Replace($r.Old, $r.New)
            # Also fix params type
            $content = $content -replace '{ params }: { params: { (id|filename): string } }', '{ params }: { params: Promise<{ $1: string }> }'
            Set-Content -Path $r.File -Value $content -NoNewline
            Write-Host "✅ Fixed: $($r.File)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Pattern not found in: $($r.File)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error with: $($r.File) - $_" -ForegroundColor Red
    }
}

Write-Host "`n✨ Script completed!" -ForegroundColor Cyan
