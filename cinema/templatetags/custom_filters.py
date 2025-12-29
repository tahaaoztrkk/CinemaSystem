import qrcode
import base64
from io import BytesIO
from django import template

register = template.Library()

@register.filter
def generate_qr(booking):
    # 1. QR Kodun İçindeki Veri (Telefonda okutunca bu çıkar)
    data = f"""
    CINEMA TICKET
    ------------------
    ID: #{booking.booking_id}
    Movie: {booking.session.movie.title}
    Date: {booking.session.start_time.strftime('%d.%m.%Y %H:%M')}
    Seat: {booking.seat_number}
    Owner: {booking.user.name}
    ------------------
    Enjoy the show!
    """
    
    # 2. QR Kodu Oluştur
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # 3. Resmi Hafızaya (RAM) Kaydet ve Base64'e Çevir
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    # 4. HTML'in anlayacağı formata sok
    return f"data:image/png;base64,{img_str}"