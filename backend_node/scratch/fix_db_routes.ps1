$path = "c:\Users\Lenovo\shriramya\ShriRamya\backend_node\src\routes\dbRoutes.js"
$content = Get-Content $path
$newLines = @(
    "// Admin users",
    "router.get('/admin/users', async (req, res) => {",
    "  try {",
    "    const db = require('../db/mongodb').mongoose.connection.db;",
    "    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();",
    "    const mapped = users.map(u => { const { _id, ...rest } = u; return { ...rest, id: _id.toString() }; });",
    "    res.json({ success: true, data: mapped });",
    "  } catch (err) { res.status(500).json({ success: false, message: err.message }); }",
    "});",
    "",
    "// Admin orders - Handed off to v1 controllers",
    "router.get('/admin/orders', (req, res, next) => next());",
    "router.patch('/admin/orders/:orderId/status', (req, res, next) => next());",
    "router.get('/admin/orders/:orderId', (req, res, next) => next());"
)

$before = $content[0..1265]
$after = $content[1277..($content.Length-1)]
$final = $before + $newLines + $after
$final | Set-Content $path
