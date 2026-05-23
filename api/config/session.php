<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('sihadir_session');
    session_start();
}
