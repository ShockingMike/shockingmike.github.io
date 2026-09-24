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
        story: ['Kiến trúc sư nghĩ bằng bản vẽ trước, khối nhà sau. Nên trang này cũng thế: mặt bằng tự hiện ra, rồi dựng lên thành khối 3D.'],
        details: { role: 'Tên, logo, thiết kế, code', tech: 'Chưa chọn', status: 'Còn nằm trên bàn vẽ' },
        cta: { pricing: 'Muốn một trang như thế này?' }
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
      label: { plan: 'Gói', plans: 'Các gói', price: 'Giá', timeline: 'Thời gian', example: 'Trang mẫu', includes: 'Gồm', sample: 'Xem trang mẫu' },
      stats: { weeks: 'tuần', sections: 'mục tối đa', rounds: 'vòng sửa', fix: 'ngày sửa lỗi miễn phí' },
      notes: ['Giá trọn gói, tính theo phạm vi công việc ghi trong báo giá. Gói nào cũng chạy tốt trên điện thoại.'],
      plans: {
        standard: { name: 'Tiêu chuẩn', fit: 'Cần một trang đẹp, rõ ràng để chạy quảng cáo hay gửi khách', for: 'Nếu bạn chỉ cần một trang đẹp, rõ ràng để chạy quảng cáo hay gửi cho khách, gói này là đủ. Mình không khuyên trả thêm khi chưa cần.', includes: ['Một khoảnh khắc đáng nhớ', 'Tối đa 6 mục', 'Màn chờ theo tiến độ tải thật', 'Âm thanh nền khi cần', 'Phác phần đầu trang để bạn duyệt trước', '2 vòng sửa', 'Sửa lỗi miễn phí 30 ngày'], timeline: '2–3 tuần', price: '12–20 triệu đồng', example: 'Kern Society', cta: 'Chọn gói Tiêu chuẩn' },
        advanced: { name: 'Nâng cao', fit: 'Có câu chuyện đáng nghe, muốn khách ở lại khám phá', for: 'Nếu thương hiệu của bạn có một câu chuyện đáng nghe — điều làm bạn khác, lý do bạn đáng giá hơn — thì một trang cuộn bình thường kể không hết. Gói này biến câu chuyện đó thành một nơi khách tự bước vào khám phá, và nhớ lâu. Đây là gói mình khuyên cho phần lớn thương hiệu.', includes: ['Một nơi để khám phá, không chỉ để cuộn', 'Tối đa 10 mục', 'Lên kịch bản trang cùng bạn trước khi thiết kế', 'Màn chờ theo tiến độ tải thật, có bản cho máy yếu', 'Âm thanh nền khi hợp', '3 vòng sửa', 'Sửa lỗi miễn phí 30 ngày'], timeline: '4–6 tuần', price: 'Từ 40 triệu đồng', example: 'Rhumb Line', cta: 'Chọn gói Nâng cao' },
        custom: { name: 'Đặt riêng', fit: 'Có hình dung lớn mà không khuôn nào chứa nổi', for: 'Dành cho khi bạn có một hình dung lớn mà không khuôn nào chứa nổi. Không dừng ở một không gian: phong cách hình ảnh, từng cảnh, từng chuyển động đều làm riêng cho thương hiệu bạn, nối thành một câu chuyện trọn vẹn. Mình đi cùng bạn từ lúc còn là ý tưởng tới khi nó đúng như bạn hình dung.', includes: ['Một thế giới: nhiều cảnh nối thành một câu chuyện', 'Hình ảnh, từng cảnh, từng chuyển động làm riêng cho thương hiệu', 'Đi cùng bạn từ lúc còn là ý tưởng', '4 vòng sửa', 'Sửa lỗi miễn phí 60 ngày'], timeline: '6–10 tuần', price: 'Từ 80 triệu đồng', example: 'Chớm', cta: 'Chọn gói Đặt riêng' }
      },
      /* the table at the head of the page: three packages side by side, rows gathered in groups. A cell that
         starts with ✓ is drawn as a tick (anything after it is a small note), — as a dash, @sample as the link
         to that package's sample page. */
      compare: {
        caption: 'Ba gói đặt cạnh nhau', recommend: 'Gói mình khuyên', details: 'Xem chi tiết',
        title: 'So sánh chi tiết',
        // the four lines on each card: the ones that differ most between the packages
        cards: { standard: ['Một khoảnh khắc đáng nhớ', 'Tối đa 6 mục', '2 vòng sửa', 'Sửa lỗi miễn phí 30 ngày'], advanced: ['Một nơi để khám phá', 'Tối đa 10 mục', 'Lên kịch bản trang cùng bạn', '3 vòng sửa'], custom: ['Một thế giới', 'Chỉ đạo hình ảnh riêng', '4 vòng sửa', 'Sửa lỗi miễn phí 60 ngày'] },
        yes: 'có', no: 'không có',
        groups: [
          { name: 'Trang', rows: [
            ['Trải nghiệm', 'Một khoảnh khắc đáng nhớ', 'Một nơi để khám phá', 'Một thế giới'],
            ['Số mục', 'tối đa 6', 'tối đa 10', 'theo kịch bản'],
            ['Trang mẫu', '@sample', '@sample', '@sample'],
            ['Màn chờ theo tiến độ tải thật', '✓', '✓', '✓'],
            ['Âm thanh nền, có nút tắt', 'khi cần', 'khi hợp', 'khi hợp'],
            ['Chỉ đạo hình ảnh riêng', '—', '—', '✓']
          ] },
          { name: 'Cách làm', rows: [
            ['Lên kịch bản trang cùng bạn', 'phác phần đầu để duyệt', '✓', '✓'],
            ['Vòng sửa', '2', '3', '4'],
            ['Sửa lỗi miễn phí sau bàn giao', '30 ngày', '30 ngày', '60 ngày']
          ] },
          { name: 'Gói nào cũng có', all: true, rows: ['Thiết kế riêng, không dùng mẫu', 'Chạy tốt trên điện thoại, máy tính bảng, máy tính', 'Có bản nhẹ cho máy yếu', 'Chuyển động nhẹ khắp trang', 'Form liên hệ, đặt hàng gửi về email', 'SEO cơ bản và ảnh đẹp khi chia sẻ', 'Chạy trên tên miền của bạn, host miễn phí, có thống kê truy cập', 'Mọi tài khoản đứng tên bạn', 'Bàn giao toàn bộ mã nguồn'] }
        ],
        after: { care: 'Chăm sóc hằng tháng từ {price}', copy: 'Viết chữ hộ báo giá riêng', text: 'Chữ trên trang do bạn gửi' }
      },
      shared: { title: 'Gói nào cũng có', items: ['Thiết kế riêng, không dùng mẫu', 'Chạy tốt trên điện thoại, máy tính bảng, máy tính', 'Form liên hệ hoặc đặt hàng gửi thẳng về email', 'SEO cơ bản và ảnh hiện đẹp khi chia sẻ', 'Chạy trên tên miền của bạn, host miễn phí (không mất phí hằng tháng), có thống kê lượt truy cập', 'Mọi tài khoản đứng tên bạn', 'Bàn giao toàn bộ mã nguồn'],
        text: 'Chữ trên trang do bạn gửi; cần viết hộ thì báo giá riêng.', notTitle: 'Không bao gồm (báo giá riêng)', not: ['bán hàng có giỏ hàng và thanh toán', 'blog hay hệ thống tự sửa nội dung', 'thêm trang', 'thêm ngôn ngữ', 'chụp ảnh', 'logo, nhận diện thương hiệu', 'tên miền và phí dịch vụ bên ngoài'] },
      care: { name: 'Chăm sóc hằng tháng', description: 'Cập nhật chữ và ảnh, thêm mục theo mùa, giữ trang chạy ổn khi trình duyệt thay đổi. Làm gì thì mình bàn theo nhu cầu của bạn.', price: '2–4 triệu đồng/tháng', cta: 'Thêm chăm sóc hằng tháng' },
      addon: { name: 'Viết nội dung', description: 'Chưa có sẵn chữ cho trang thì mình viết giúp.', price: 'Báo giá riêng', cta: 'Thêm viết nội dung' },
      process: { title: 'Quy trình làm việc', steps: ['Bạn gửi email cho mình: thương hiệu, trang hiện có, thời hạn và ngân sách.', 'Trong 2 ngày làm việc, mình gửi báo giá trọn gói, ghi rõ những việc sẽ làm.', 'Bạn đặt cọc 50%. Mình phác phần đầu trang để bạn duyệt, rồi mới dựng. Số vòng sửa theo gói.', 'Thanh toán 50% còn lại khi trang lên mạng, trên tên miền và tài khoản của bạn.'] },
      terms: { title: 'Điều khoản', items: ['Bạn cung cấp nội dung chữ và hình ảnh. Cần viết hộ thì mình báo giá thêm.', 'Toàn bộ trang và mã nguồn thuộc về bạn.', 'Sửa quá số vòng của gói thì mình báo giá trước khi làm.', 'Khách trong nước thanh toán bằng chuyển khoản, khách nước ngoài qua PayPal.', 'Trao đổi qua email shockingmikedesign@gmail.com, cần thì hẹn gọi.'] },
      faq: { title: 'Câu hỏi thường gặp', items: [
        ['Cần chuẩn bị gì trước khi bắt đầu?', 'Tên thương hiệu, sản phẩm muốn giới thiệu, chữ và ảnh đang có, cùng vài trang web bạn thích. Còn thiếu gì, mình sẽ nói rõ.'],
        ['Sau khi bàn giao, có sửa trang được nữa không?', 'Có. Sửa lỗi miễn phí 30 hoặc 60 ngày sau khi bàn giao, tuỳ gói. Sau đó, gói chăm sóc hằng tháng lo việc cập nhật chữ, ảnh, trang khuyến mãi.'],
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
        item: { standard: 'Gói Tiêu chuẩn: một khoảnh khắc đáng nhớ, tối đa 6 mục', advanced: 'Gói Nâng cao: một nơi để khám phá, tối đa 10 mục', custom: 'Gói Đặt riêng: nhiều cảnh nối thành một câu chuyện', care: 'Chăm sóc hằng tháng × {n} tháng', copywriting: 'Viết nội dung', copywritingAmount: 'Báo giá riêng' },
        total: 'Tổng tạm tính', totalFrom: 'Từ', excludes: 'Chưa gồm phần viết nội dung (báo giá riêng).',
        note: 'Đây là báo giá sơ bộ theo bảng giá công khai. Mike xác nhận giá chốt và phạm vi công việc trong 2 ngày làm việc.',
        termsTitle: 'Điều khoản tóm tắt',
        terms: ['Đặt cọc 50% khi bắt đầu, 50% còn lại khi trang lên mạng.', 'Duyệt bản phác phần đầu trang trước khi dựng; sửa {rounds} vòng.', 'Khách hàng cung cấp nội dung chữ và hình ảnh.', 'Trang và mã nguồn thuộc về khách hàng, chạy trên tên miền và tài khoản của khách.', 'Thanh toán: chuyển khoản (trong nước), PayPal (quốc tế).', 'Sửa lỗi miễn phí {days} ngày sau khi bàn giao.'],
        contactLabel: 'Liên hệ', contact: 'shockingmikedesign@gmail.com'
      },
      button: { send: 'Gửi yêu cầu cho Mike', copy: 'Chép báo giá', copied: 'Đã chép', edit: 'Sửa thông tin', print: 'In hoặc lưu PDF', close: 'Đóng' },
      send: { hint: 'Nút này mở ứng dụng email của bạn, có sẵn báo giá trong thư.', fallback: 'Không mở được email? Chép báo giá và gửi tới shockingmikedesign@gmail.com.' },
      mail: { subject: 'Yêu cầu báo giá: gói {plan} cho {brand}', body: ['Chào Mike,', '', 'Mình muốn làm landing page cho {brand}. Báo giá sơ bộ ở dưới:', '', '{estimate}', '', 'Ghi chú thêm:', '', '[Tên bạn]', '[Số điện thoại, nếu muốn hẹn gọi]'] }
    }
  }
  
};
