/* copy.js — every word on the portfolio and the pricing page, in English and Vietnamese.
   Portfolio: docs/content/portfolio-records.md (+ -vi). Pricing: docs/content/pricing-serious.md (+ -vi);
   the rows that lead from a record to pricing: portfolio_cta.* in the same files.
   Edits agreed by the lead (22/9): English brand.note uses the writer's alternative line; the English Kern and
   Rhumb stories lose the sentence the writer marked; the Vietnamese role line uses the writer's alternative;
   the pricing row on each record is plain, in each language's own words. Keep the keys; change only the strings. */

/* Two languages live here while the site is being built. The build script (build.mjs) keeps exactly one of
   them in each published copy, cutting at the /*[en]* / and /*[vi]* / marks below, so the English site never
   ships a Vietnamese price and the Vietnamese site never ships a dollar figure. */
export const LANGS = [ 'vi'];

export const COPY = {
  

  
  vi: {
    site: {
      title: 'Shocking Mike · Design Engineer ở Việt Nam',
      description: 'Những trang web mình tự thiết kế, tự code, xếp thành một chồng đĩa. Rút đĩa nào ra cũng có chuyện để kể.'
    },
    brand: {
      name: 'Shocking Mike',
      role: ['Tự thiết kế, tự code web', 'Việt Nam'],
      note: 'Thiết kế với code đều một tay mình làm, từ đầu tới cuối. Không dùng mẫu dựng sẵn.'
    },
    ui: {
      langToggle: 'English', langToggleAria: 'Read this page in English',
      back: 'Cất đĩa', helpLabel: 'Cách xem',
      help: 'Mỗi đĩa là một trang web mình làm. Chọn đĩa nào là đọc được chuyện đĩa ấy.',
      comingSoon: 'Sắp phát hành', pricing: 'Bảng giá', record: 'Mở đĩa {title}', home: 'Về màn đầu',
      loading: 'Đang quay đĩa cho đủ tốc độ', loadingPct: 'Đã tải {p}%', loadingDone: 'Đủ 33⅓ vòng/phút. Vào thôi.',
      sealed: 'Còn nguyên seal. Mở đĩa rồi mới đọc được.',
      details: 'Ghi công', flip: 'Xem mặt sau đĩa {title}',
      want: 'Muốn một trang như thế này?', wantPrice: 'Xem bảng giá',
      flyer: { eyebrow: 'Shocking Mike', title: 'Bảng giá', more: 'Xem bảng giá đầy đủ', open: 'Mở trang bảng giá' },
      email: 'shockingmikedesign@gmail.com', byline: 'Designed & built by Shocking Mike'
    },
    label: { role: 'Vai trò', tech: 'Công nghệ', year: 'Năm', status: 'Tình trạng' },
    records: {
      kern: {
        subtitle: 'Xưởng font độc lập',
        story: [
          'Font thì phải cho người ta nghịch mới bán được. Nên cái tên to đùng trên cùng chính là đồ chơi: chuột tới gần là chữ đậm lên, giãn ra.',
          'Khó nhất là cho từng chữ to ra mà cả dòng không tràn khỏi màn hình. Còn font là font thật, miễn phí, mình chỉ đổi tên; bấm nút dùng thử là lộ.'
        ],
        details: { role: 'Tên, logo, thiết kế, code', tech: 'Font biến thiên, GSAP, Lenis', year: '2026', status: 'Đã phát hành' },
        cta: { visit: 'Vào xem', preview: 'Xem đoạn demo', pricing: 'Muốn một trang như thế này?' }
      },
      rhumb: {
        subtitle: 'Lò rang cà phê',
        story: [
          'Hãng cà phê nào cũng kể mình đi xa tìm hạt. Hãng này đi thật, bằng tàu; bạn ngồi bên bàn trong khoang, cùng gom cho đủ sáu loại.',
          'Mình thích nhất tách cà phê: tàu nghiêng thì nó sóng sánh theo, chậm nửa nhịp, như nước thật. Còn tiếng biển thì không thu âm, máy tạo ra ngay lúc bạn nghe.'
        ],
        details: { role: 'Tên, logo, cảnh 3D, âm thanh, code', tech: 'three.js, Web Audio, Canvas', year: '2026', status: 'Đã phát hành' },
        cta: { visit: 'Vào xem', preview: 'Xem đoạn demo', pricing: 'Muốn một trang 3D như thế này?' }
      },
      chom: {
        subtitle: 'Xưởng hương Hà Nội',
        story: [
          'Nói là bán nước hoa, chứ thật ra Chớm bán lại cho người Hà Nội một mẩu tuổi thơ của chính họ; cái chai chỉ là cách giao hàng.',
          'Phố dựng 3D, tô bằng nét cọ thật quét vào máy. Khó nhất lại là cái chai: viền dày hơn chẳng giúp nó nổi lên bao nhiêu, làm thẫm chỗ nó đứng thì được.'
        ],
        details: { role: 'Tên, logo, thế giới 3D, code', tech: 'three.js, shader vẽ tranh tự viết, MakeHuman, Blender', year: '2026', status: 'Đã phát hành' },
        cta: { visit: 'Vào xem', preview: 'Xem đoạn demo', pricing: 'Muốn một trang làm riêng như thế này?' }
      },
      kozo: {
        subtitle: 'Văn phòng kiến trúc',
        story: [
          'Kōzō trong tiếng Nhật là kết cấu, đúng cái phần của toà nhà chẳng ai dừng lại ngắm. Thước đo của studio là một bức tường thành cổ: bốn trăm năm không vữa, và không viên đá nào đặt sang chỗ khác mà vừa.',
          'Sáu kiến trúc sư, hai thợ mộc, chung một xưởng cưa cũ ở Nagano.'
        ],
        details: { role: 'Tên, logo, thế giới 3D, âm thanh, code', tech: 'three.js, shader nét mực tự viết, Web Audio', year: '2026', status: 'Đã phát hành' },
        cta: { visit: 'Vào xem (tiếng Anh)', preview: 'Xem đoạn demo', pricing: 'Muốn dựng cả một thế giới như thế này?' }
      },
      hadal: {
        subtitle: 'Viện hải dương học',
        story: ['Lặn từ mặt nước xuống tận vực sâu tối om, nơi sinh vật tự mang đèn theo.'],
        details: { role: 'Tên, logo, thiết kế, code', tech: 'Chưa chọn', status: 'Chưa xuống nước' },
        cta: { pricing: 'Muốn một trang như thế này?' }
      },
      perihelion: {
        subtitle: 'Du lịch vũ trụ',
        story: ['Trang web chính là chuyến đi: bay 3D từ quỹ đạo Trái Đất ra tới Mặt Trăng.'],
        details: { role: 'Tên, logo, thiết kế, code', tech: 'Chưa chọn', status: 'Còn nằm ở bệ phóng' },
        cta: { pricing: 'Muốn một trang như thế này?' }
      }
    },
    pricing: {
      /* docs/content/pricing-serious-vi.md. Sếp chốt (22/9): đầu trang dùng câu không nêu ngành; "Chạy tốt trên điện thoại"
         gom từ ba gói thành một ghi chú chung; giữ plans.example_note. */
      meta: { title: 'Bảng giá · Shocking Mike', description: 'Landing page cho thương hiệu, do Shocking Mike tự thiết kế và tự code. Ba gói giá rõ ràng từ 12 triệu đồng, trả lời trong 2 ngày làm việc.' },
      back: 'Về trang portfolio',
      hero: { title: 'Bảng giá', lead: 'Mình là Mike, tự thiết kế và tự code landing page cho thương hiệu. Giá gói nào cũng ghi hết ở đây, khỏi phải nhắn hỏi. Còn nếu bạn nhắn, mình trả lời trong 2 ngày làm việc.' },
      label: { plan: 'Gói', plans: 'Các gói', price: 'Giá', timeline: 'Thời gian', example: 'Trang mẫu', includes: 'Bạn nhận được', sample: 'Xem trang mẫu' },
      stats: { weeks: 'tuần', sections: 'phần tối đa', rounds: 'vòng sửa', fix: 'ngày sửa lỗi miễn phí' },
      notes: ['Giá trọn gói, tính theo phạm vi công việc ghi trong báo giá. Gói nào cũng chạy tốt trên điện thoại.'],
      /* chữ các gói, viết lại 2/10 theo đề xuất của Mike (D:\Rando\De_xuat_noi_dung_3_goi_gia.md): giá giữ nguyên, chữ rõ hơn.
         Các ô giống bản tiếng Anh: tagline, fit, for, plus, includes, timeNote, honest, upgrade. */
      plans: {
        standard: { name: 'Tiêu chuẩn', tagline: 'Một khoảnh khắc đáng nhớ', fit: 'Hợp khi chạy quảng cáo hay ra mắt một sản phẩm', priceNote: 'Giá tuỳ số phần cần làm 3D.',
          for: 'Bạn đang chạy quảng cáo, ra mắt một sản phẩm, hay cần một trang gửi khách mà không phải ngại. Bạn không cần kể chuyện dài. Bạn cần một trang rõ ràng, trông đắt hơn số tiền bỏ ra.',
          plus: '', includes: ['Một trang đủ chỗ cho tối đa 6 phần: thường là phần mở đầu thật ấn tượng, sản phẩm, một đoạn chuyện ngắn, đánh giá của khách, và chỗ liên hệ hay đặt hàng', 'Một khoảnh khắc đáng nhớ: một chuyển động hay một cảnh 3D mà người xem nhớ lâu', 'Màn chờ theo tiến độ tải thật', 'Âm thanh nền khi hợp, có nút tắt', 'Bản phác phần mở đầu để bạn duyệt trước khi mình dựng'],
          timeline: '2–3 tuần', timeNote: 'Tính từ ngày bạn duyệt bản phác.', price: '12–20 triệu đồng', example: 'Kern Society', cta: 'Chọn gói Tiêu chuẩn',
          honest: ['Nói thật, gói này đủ chưa?', 'Nếu bạn cần một trang gọn để dẫn khách từ quảng cáo về thì đủ rồi. Mình không khuyên trả thêm khi chưa cần. Còn nếu thương hiệu của bạn cần cho khách thấy vì sao đáng giá hơn, gói Nâng cao làm đúng việc đó.'],
          upgrade: ['Làm gọn trước, nâng cấp sau', 'Trong 6 tháng sau khi trang lên mạng, nếu lên gói Nâng cao thì số tiền gói Tiêu chuẩn được trừ vào.'] },
        advanced: { name: 'Nâng cao', tagline: 'Một nơi để khám phá', fit: 'Hợp với thương hiệu cần cho khách thấy vì sao đáng giá hơn', priceNote: 'Giá tuỳ số cảnh 3D và chuyển động làm riêng.',
          for: 'Thương hiệu của bạn có một câu chuyện đáng nghe: điều làm bạn khác, lý do bạn đắt hơn tiệm bên cạnh. Một trang cuộn bình thường kể không hết. Bạn cần khách ở lại, ngó nghiêng, và lúc rời trang thì đã hiểu vì sao bạn đáng giá như vậy.',
          plus: 'Đủ mọi thứ của gói Tiêu chuẩn, cộng thêm:', includes: ['Mình cùng bạn lên câu chuyện, viết thành kịch bản để bạn duyệt trước khi thiết kế', 'Trang dựng thành một nơi để khám phá, đủ chỗ cho tối đa 10 phần', 'Tặng 1 tháng chăm sóc đầu tiên: cập nhật chữ và ảnh, mình lo'],
          timeline: '4–6 tuần', timeNote: 'Tính từ ngày bạn duyệt kịch bản.', price: 'Từ 40 triệu đồng', example: 'Rhumb Line', cta: 'Chọn gói Nâng cao',
          honest: ['Vì sao mình khuyên gói này', 'Phần lớn thương hiệu không thiếu thiết kế đẹp, mà thiếu câu trả lời cho “sao lại chọn bạn”. Gói Tiêu chuẩn cho bạn một trang đẹp. Gói Nâng cao cho khách một lý do để chọn bạn. Nếu bạn chỉ cần trang chạy quảng cáo thì gói Tiêu chuẩn là đủ, và mình sẽ nói thẳng như vậy.'] },
        custom: { name: 'Đặt riêng', tagline: 'Một thế giới', fit: 'Hợp với lần ra mắt hay sản phẩm chủ lực làm nên tên tuổi thương hiệu', priceNote: 'Giá tuỳ thế giới rộng đến đâu; mình báo giá sau khi trao đổi.',
          for: 'Bạn có một hình dung lớn mà không khuôn mẫu nào chứa nổi: một lần ra mắt, một sản phẩm chủ lực, một trang làm nên tên tuổi thương hiệu. Bạn không muốn một trang chỉ là bản đẹp hơn của trang người khác.',
          plus: 'Đủ mọi thứ của gói Nâng cao, cộng thêm:', includes: ['Phong cách hình ảnh làm riêng cho thương hiệu: từng cảnh, từng chuyển động thiết kế cho bạn, không lấy lại từ dự án khác', 'Hai hướng hình ảnh để bạn chọn trước khi mình dựng. Bạn duyệt kịch bản, rồi hình ảnh, rồi cả trang', 'Câu chuyện cần bao nhiêu phần thì làm bấy nhiêu, trải qua nhiều không gian', 'Tặng 3 tháng chăm sóc đầu tiên'],
          timeline: '6–10 tuần', timeNote: 'Tính từ ngày bạn duyệt kịch bản.', price: 'Từ 80 triệu đồng', example: 'Chớm', cta: 'Bàn với mình về gói Đặt riêng',
          honest: ['Nói thật, bạn có cần gói này không?', 'Nếu bạn chưa hình dung được mình muốn gì, hãy bắt đầu với gói Nâng cao. Gói Đặt riêng dành cho khi bạn đã biết trang này phải khác hẳn mọi trang khác.'] }
      },
      /* the table at the head of the page: three packages side by side, rows gathered in groups. A cell that
         starts with ✓ is drawn as a tick (anything after it is a small note), — as a dash, @sample as the link
         to that package's sample page. */
      compare: {
        caption: 'Ba gói đặt cạnh nhau', recommend: 'Gói mình khuyên', details: 'Xem chi tiết',
        title: 'So sánh chi tiết',
        // bốn dòng trên mỗi thẻ, trả lời cùng bốn câu hỏi theo cùng thứ tự: có hợp với mình không, mình được gì,
        // lỡ không ưng thì sao, lỡ sau này hỏng thì sao
        cards: {
          standard: ['Hợp khi chạy quảng cáo hay ra mắt một sản phẩm', 'Đủ chỗ cho phần cốt lõi: mở đầu ấn tượng, sản phẩm, câu chuyện, đánh giá, liên hệ', 'Bạn duyệt bản phác trước khi mình dựng, kèm 2 vòng sửa', 'Phần mình làm mà hỏng trong 30 ngày đầu, mình sửa miễn phí'],
          advanced: ['Hợp với thương hiệu cần cho khách thấy vì sao đáng giá hơn', 'Một trang để khám phá, không chỉ để cuộn, đủ chỗ cho tối đa 10 phần', 'Câu chuyện viết thành kịch bản để bạn duyệt, kèm 3 vòng sửa', 'Sửa lỗi miễn phí 60 ngày, tặng 1 tháng chăm sóc đầu tiên'],
          custom: ['Hợp với lần ra mắt hay sản phẩm chủ lực làm nên tên tuổi thương hiệu', 'Phong cách hình ảnh làm riêng, bao nhiêu phần tuỳ câu chuyện', 'Bạn chọn 1 trong 2 hướng hình ảnh trước khi mình dựng, kèm 4 vòng sửa', 'Sửa lỗi miễn phí 90 ngày, tặng 3 tháng chăm sóc đầu tiên']
        },
        yes: 'có', no: 'không có',
        groups: [
          { name: 'Trang', rows: [
            ['Hợp với', 'Quảng cáo, ra mắt một sản phẩm', 'Thương hiệu cần cho thấy vì sao đáng giá hơn', 'Lần ra mắt hay sản phẩm chủ lực'],
            ['Trải nghiệm', 'Một khoảnh khắc đáng nhớ', 'Một nơi để khám phá', 'Một thế giới'],
            ['Số phần của trang', 'tối đa 6', 'tối đa 10', 'theo câu chuyện'],
            ['Trang mẫu', '@sample', '@sample', '@sample'],
            ['Phong cách hình ảnh làm riêng', '—', '—', '✓'],
            ['Âm thanh nền, có nút tắt', 'khi hợp', 'khi hợp', 'khi hợp'],
            ['Màn chờ theo tiến độ tải thật', '✓', '✓', '✓']
          ] },
          { name: 'Cách làm', rows: [
            ['Lên câu chuyện', 'phác phần mở đầu', 'kịch bản viết ra để bạn duyệt', 'kịch bản, thêm 2 hướng hình ảnh'],
            ['Vòng sửa', '2', '3', '4'],
            ['Sửa lỗi miễn phí sau bàn giao', '30 ngày', '60 ngày', '90 ngày'],
            ['Tháng chăm sóc được tặng', '—', '1', '3'],
            ['Lên gói sau', 'được trừ vào gói Nâng cao trong 6 tháng sau khi trang lên mạng', '—', '—'],
            ['Thời gian', '2–3 tuần', '4–6 tuần', '6–10 tuần']
          ] },
          { name: 'Gói nào cũng có', all: true, rows: ['Thiết kế riêng, không dùng mẫu', 'Chạy tốt trên điện thoại, máy tính bảng, máy tính', 'Có bản nhẹ cho máy yếu', 'Chuyển động nhẹ khắp trang', 'Form liên hệ, đặt hàng gửi về email', 'SEO cơ bản và ảnh đẹp khi chia sẻ', 'Chạy trên tên miền của bạn, host miễn phí, có thống kê truy cập', 'Mọi tài khoản đứng tên bạn', 'Bàn giao toàn bộ mã nguồn'] }
        ],
        after: { care: 'Chăm sóc hằng tháng từ {price}', copy: 'Viết chữ hộ báo giá riêng', text: 'Chữ trên trang do bạn gửi' }
      },
      shared: { title: 'Gói nào cũng có', items: ['Thiết kế riêng, không dùng mẫu', 'Chạy tốt trên điện thoại, máy tính bảng, máy tính', 'Form liên hệ hoặc đặt hàng gửi thẳng về email', 'SEO cơ bản và ảnh hiện đẹp khi chia sẻ', 'Chạy trên tên miền của bạn, host miễn phí (không mất phí hằng tháng), có thống kê lượt truy cập', 'Mọi tài khoản đứng tên bạn', 'Bàn giao toàn bộ mã nguồn'],
        text: 'Chữ trên trang do bạn gửi; cần viết hộ thì báo giá riêng.', notTitle: 'Không bao gồm (báo giá riêng)', not: ['bán hàng có giỏ hàng và thanh toán', 'blog hay hệ thống tự sửa nội dung', 'thêm trang', 'thêm ngôn ngữ', 'chụp ảnh', 'logo, nhận diện thương hiệu', 'tên miền và phí dịch vụ bên ngoài'] },
      care: { name: 'Chăm sóc hằng tháng', description: 'Cập nhật chữ và ảnh, đổi nội dung theo mùa, giữ trang chạy ổn khi trình duyệt thay đổi. Làm gì thì mình bàn theo nhu cầu của bạn.', price: '2–4 triệu đồng/tháng', cta: 'Thêm chăm sóc hằng tháng' },
      addon: { name: 'Viết nội dung', description: 'Chưa có sẵn chữ cho trang thì mình viết giúp.', price: 'Báo giá riêng', cta: 'Thêm viết nội dung' },
      process: { title: 'Quy trình làm việc', steps: ['Bạn gửi email cho mình: thương hiệu, trang hiện có, thời hạn và ngân sách.', 'Trong 2 ngày làm việc, mình gửi báo giá trọn gói, ghi rõ những việc sẽ làm.', 'Bạn đặt cọc 50%. Mình với bạn chốt kế hoạch trước (gói Tiêu chuẩn: bản phác phần mở đầu; gói Nâng cao và Đặt riêng: kịch bản viết ra để bạn duyệt, gói Đặt riêng thêm 2 hướng hình ảnh để chọn), rồi mình mới dựng. Số vòng sửa theo gói.', 'Thanh toán 50% còn lại khi trang lên mạng, trên tên miền và tài khoản của bạn.'] },
      terms: { title: 'Điều khoản', items: ['Bạn cung cấp nội dung chữ và hình ảnh. Cần viết hộ thì mình báo giá thêm.', 'Toàn bộ trang và mã nguồn thuộc về bạn.', 'Sửa quá số vòng của gói thì mình báo giá trước khi làm.', 'Khách trong nước thanh toán bằng chuyển khoản, khách nước ngoài qua PayPal.', 'Trao đổi qua email shockingmikedesign@gmail.com, cần thì hẹn gọi.'] },
      faq: { title: 'Câu hỏi thường gặp', items: [
        ['Cần chuẩn bị gì trước khi bắt đầu?', 'Tên thương hiệu, sản phẩm muốn giới thiệu, chữ và ảnh đang có, cùng vài trang web bạn thích. Còn thiếu gì, mình sẽ nói rõ.'],
        ['Sau khi bàn giao, có sửa trang được nữa không?', 'Có. Phần mình làm mà hỏng thì mình sửa miễn phí 30, 60 hoặc 90 ngày sau khi bàn giao, tuỳ gói. Gói Nâng cao được tặng 1 tháng chăm sóc đầu tiên, gói Đặt riêng được tặng 3 tháng; sau đó gói chăm sóc hằng tháng lo việc cập nhật chữ, ảnh, trang khuyến mãi.'],
        ['Trang có chạy tốt và nhanh trên điện thoại không?', 'Có. Trang nào mình cũng thử trên điện thoại và màn hình lớn trước khi bàn giao. Trang 3D cần vài giây để tải trên điện thoại, nên có màn chờ hiện đúng phần trăm đã tải.']
      ] },
      contact: { title: 'Chưa chắc gói nào hợp?', text: 'Bạn cứ gửi ngân sách và điều trang cần làm được. Mình sẽ gợi ý gói hợp, kể cả khi gói nhỏ hơn là đủ.', email: 'shockingmikedesign@gmail.com',
        mailSubject: 'Hỏi về landing page cho [tên thương hiệu]',
        mailBody: ['Chào Mike,', '', 'Thương hiệu:', 'Trang hiện có (website, fanpage, Shopee…):', 'Cần xong trước:', 'Ngân sách:', 'Mình cần trang làm được gì:', '', '[Tên bạn]'] },
      form: {
        title: 'Thông tin dự án', intro: 'Điền vài thông tin để tạo báo giá sơ bộ, rồi gửi cho mình.',
        plan: 'Gói đã chọn', care: 'Chăm sóc hằng tháng', careMonths: 'Số tháng', careNone: 'Không cần', careUnit: 'tháng',
        copywriting: 'Cần mình viết nội dung', copywritingNote: 'báo giá riêng',
        fields: [
          { key: 'brand', label: 'Tên thương hiệu', hint: 'Và sản phẩm bạn bán', required: true },
          { key: 'site', label: 'Trang hiện có', hint: 'Website, fanpage, Shopee… (nếu có)' },
          { key: 'deadline', label: 'Cần xong trước', hint: 'Để trống nếu chưa có hạn' },
          { key: 'budget', label: 'Ngân sách dự kiến', hint: 'Ví dụ: 15–20 triệu' }
        ],
        required: 'bắt buộc', errorPlan: 'Chọn một gói để tiếp tục.', errorBrand: 'Nhập tên thương hiệu để tiếp tục.', submit: 'Tạo báo giá sơ bộ'
      },
      estimate: {
        title: 'BÁO GIÁ SƠ BỘ', from: 'Shocking Mike · Thiết kế và code landing page',
        date: 'Ngày lập', client: 'Thương hiệu', site: 'Trang hiện có', deadline: 'Cần xong trước', budget: 'Ngân sách dự kiến', empty: 'Chưa cung cấp',
        item: { standard: 'Gói Tiêu chuẩn: một khoảnh khắc đáng nhớ, tối đa 6 phần', advanced: 'Gói Nâng cao: một nơi để khám phá, tối đa 10 phần, tặng 1 tháng chăm sóc đầu tiên', custom: 'Gói Đặt riêng: một thế giới làm riêng cho thương hiệu, tặng 3 tháng chăm sóc đầu tiên', care: 'Chăm sóc hằng tháng × {n} tháng', copywriting: 'Viết nội dung', copywritingAmount: 'Báo giá riêng' },
        total: 'Tổng tạm tính', totalFrom: 'Từ', excludes: 'Chưa gồm phần viết nội dung (báo giá riêng).',
        note: 'Đây là báo giá sơ bộ theo bảng giá công khai. Mike xác nhận giá chốt và phạm vi công việc trong 2 ngày làm việc.',
        termsTitle: 'Điều khoản tóm tắt',
        terms: ['Đặt cọc 50% khi bắt đầu, 50% còn lại khi trang lên mạng.', 'Duyệt kế hoạch trước khi dựng; sửa {rounds} vòng.', 'Khách hàng cung cấp nội dung chữ và hình ảnh.', 'Trang và mã nguồn thuộc về khách hàng, chạy trên tên miền và tài khoản của khách.', 'Thanh toán: chuyển khoản (trong nước), PayPal (quốc tế).', 'Phần Mike làm mà hỏng trong {days} ngày sau khi bàn giao thì sửa miễn phí.'],
        contactLabel: 'Liên hệ', contact: 'shockingmikedesign@gmail.com'
      },
      button: { send: 'Gửi yêu cầu cho Mike', copy: 'Chép báo giá', copied: 'Đã chép', edit: 'Sửa thông tin', print: 'In hoặc lưu PDF', close: 'Đóng' },
      send: { hint: 'Nút này mở ứng dụng email của bạn, có sẵn báo giá trong thư.', fallback: 'Không mở được email? Chép báo giá và gửi tới shockingmikedesign@gmail.com.' },
      mail: { subject: 'Yêu cầu báo giá: gói {plan} cho {brand}', body: ['Chào Mike,', '', 'Mình muốn làm landing page cho {brand}. Báo giá sơ bộ ở dưới:', '', '{estimate}', '', 'Ghi chú thêm:', '', '[Tên bạn]', '[Số điện thoại, nếu muốn hẹn gọi]'] }
    }
  }
  
};
