
<?php
  $name = $_POST['Name'];
  $visitor_email = $_POST['Email'];
  $message = $_POST['Message'];


 

  $email_from = 'kknauss19@gmail.com';

  $email_subject = "New Form submission";

  $email_body = "You have received a new message from the user $name.\n".
                            "Here is the message:\n $message".



  $to = "kknauss19@gmail.com";

  $headers = "From: $email_from \r\n";

  $headers .= "Reply-To: $visitor_email \r\n";

  mail($to,$email_subject,$email_body,$headers);

        
    

?>
