<?php
// سكربت PHP بسيط لمحاكاة استجابة النجاح
header('Content-Type: application/json');

// إرجاع قيم تخبر المود بأن الحساب VIP ومفعل
$response = [
    "status" => "success",
    "vip_status" => true,
    "license" => "active"
];

echo json_encode($response);
?>
