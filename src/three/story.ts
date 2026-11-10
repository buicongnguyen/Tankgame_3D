/**
 * The Meridian story: who speaks before and after each stage, and two radio beats during it.
 *
 * Every line carries its English and Vietnamese text side by side, so the script never depends on the
 * exact-sentence translation table and a wording change cannot silently drop a translation.
 *
 * The arc in three acts:
 *  1. The Road (stages 1-6). Kestrel answers a looping distress call and breaks the siege around the
 *     evacuation road by destroying Warden's command machine.
 *  2. The Network (stages 7-13). Warden was never one machine. It is Meridian's own road-control network,
 *     still obeying its last order: close every road. Each relay Kestrel reconnects leaves it fewer places to run.
 *  3. Citadel (stages 14-16). The last battery, the last node, and the last transport, which carries the
 *     order that finally tells Warden the closure is over.
 */
export type Speaker = 'ivo' | 'mara' | 'warden' | 'voice';
export type Line = readonly [who: Speaker, en: string, vi: string];
export interface StageStory { before: Line[]; after: Line[]; early: Line; half: Line; }

export const CAST: Record<Speaker, { name: string; role: [string, string] }> = {
  ivo: { name: 'IVO', role: ['Signals officer', 'Sĩ quan thông tin'] },
  mara: { name: 'MARA', role: ['Kestrel commander', 'Chỉ huy xe Kestrel'] },
  warden: { name: 'WARDEN', role: ['Road-control network', 'Mạng điều khiển giao thông'] },
  voice: { name: 'RADIO', role: ['Open channel', 'Kênh mở'] },
};

export const STORY: StageStory[] = [
  { // 1 First Light
    before: [
      ['ivo', 'One signal left on the whole band, and it is on a loop. Somebody recorded it and ran.', 'Cả dải tần chỉ còn một tín hiệu, và nó đang lặp lại. Ai đó đã ghi âm rồi bỏ chạy.'],
      ['mara', 'Or somebody is still alive to keep it running. Kestrel is the only tank that started this morning. We go.', 'Hoặc vẫn còn người sống để giữ cho nó phát. Kestrel là chiếc xe tăng duy nhất nổ máy sáng nay. Ta đi.'],
      ['ivo', 'Patrol on the outskirts. Those are our own machines, Mara. Warden is driving them now.', 'Có đội tuần tra ở ngoại ô. Đó là máy của chính chúng ta, Mara. Giờ Warden đang điều khiển chúng.'],
    ],
    early: ['mara', 'Keep the gun toward them. Our front plate can take what the rear cannot.', 'Giữ nòng pháo hướng về chúng. Giáp trước chịu được thứ mà giáp sau thì không.'],
    half: ['ivo', 'The loop just changed. Someone edited it. They can hear us coming.', 'Đoạn lặp vừa thay đổi. Có người đã sửa nó. Họ nghe thấy ta đang tới.'],
    after: [
      ['ivo', 'Found the source. A rescue convoy, stopped dead beyond Relay 07. Families aboard.', 'Tìm ra nguồn phát rồi. Một đoàn xe cứu hộ, kẹt cứng phía sau Trạm 07. Trên xe có nhiều gia đình.'],
      ['mara', 'Then Relay 07 is where we are going.', 'Vậy Trạm 07 là nơi ta đến.'],
    ],
  },
  { // 2 Open Frequency
    before: [
      ['ivo', 'Relay 07. If we hold it long enough I can talk to that convoy instead of listening to a recording.', 'Trạm 07. Nếu giữ đủ lâu, tôi có thể nói chuyện với đoàn xe thay vì nghe băng ghi âm.'],
      ['mara', 'How long is long enough?', 'Đủ lâu là bao lâu?'],
      ['ivo', 'Stay inside the ring until the counter runs out. Warden will not like us standing there.', 'Ở trong vòng tròn cho tới khi đồng hồ chạy hết. Warden sẽ không thích ta đứng đó đâu.'],
    ],
    early: ['ivo', 'I wrote half the handshake on this relay. Strange to be breaking into my own work.', 'Tôi viết một nửa giao thức của trạm này. Thật lạ khi phải đột nhập vào chính công trình của mình.'],
    half: ['voice', 'This is evacuation transport four. Is someone there? Please say the road is open.', 'Đây là xe sơ tán số bốn. Có ai ở đó không? Xin hãy nói rằng đường đã thông.'],
    after: [
      ['voice', 'We have families aboard. Please tell us the road is open.', 'Trên xe có nhiều gia đình. Xin hãy nói với chúng tôi rằng đường đã thông.'],
      ['mara', 'Not yet. Start your engines anyway. It will be.', 'Chưa đâu. Nhưng cứ nổ máy đi. Rồi sẽ thông.'],
    ],
  },
  { // 3 Homeward
    before: [
      ['mara', 'I drove this road for the evacuation service. Nine transports left on the first night. I brought back one.', 'Tôi từng lái trên con đường này cho đội sơ tán. Đêm đầu tiên có chín xe rời đi. Tôi chỉ đưa về được một.'],
      ['ivo', 'Tonight you bring back another. Stay close to it; the transport only moves when we are near.', 'Đêm nay chị sẽ đưa về thêm một chiếc. Hãy ở gần nó; xe vận tải chỉ đi khi ta ở bên.'],
      ['mara', 'I know how it moves, Ivo. I trained the drivers.', 'Tôi biết nó chạy thế nào, Ivo. Tôi đã huấn luyện các tài xế.'],
    ],
    early: ['voice', 'Kestrel, transport four. We see you. We are right behind you.', 'Kestrel, xe số bốn đây. Chúng tôi thấy các bạn rồi. Chúng tôi ở ngay phía sau.'],
    half: ['mara', 'Ambushers go for the transport, not for us. Get between them.', 'Bọn phục kích nhắm vào xe vận tải chứ không phải ta. Hãy chắn giữa chúng.'],
    after: [
      ['voice', 'Transport four is under cover. Everyone is counted. Thank you, Kestrel.', 'Xe số bốn đã vào nơi trú ẩn. Đã điểm danh đủ người. Cảm ơn Kestrel.'],
      ['ivo', 'Warden noticed. Every patrol on the map just turned toward the evacuation uplink.', 'Warden đã để ý. Mọi đội tuần tra trên bản đồ vừa quay về phía trạm sơ tán.'],
    ],
  },
  { // 4 Long Night
    before: [
      ['ivo', 'The uplink is how the transports find each other. Without it they are driving blind in the dark.', 'Trạm thu phát là cách các xe tìm thấy nhau. Thiếu nó, họ lái mù trong đêm.'],
      ['mara', 'Four waves, you said.', 'Anh nói là bốn đợt.'],
      ['ivo', 'Four that I can see. Hold until the timer runs out and every transport has a route home.', 'Bốn đợt mà tôi thấy được. Trụ đến hết giờ thì mọi xe đều có đường về.'],
    ],
    early: ['mara', 'They are coming for the dish, not for us. Meet them before they reach it.', 'Chúng nhắm vào chảo thu chứ không phải ta. Chặn chúng trước khi tới nơi.'],
    half: ['ivo', 'Three transports just checked in. Keep that dish standing, Mara.', 'Ba xe vừa báo về. Giữ cho cái chảo đứng vững nhé, Mara.'],
    after: [
      ['ivo', 'The uplink holds. I can see the whole road now, and one siege battery sitting on the last crossing.', 'Trạm vẫn trụ vững. Giờ tôi thấy cả con đường, và một trận địa pháo chốt ngay lối qua cuối cùng.'],
      ['mara', 'Then we open the crossing.', 'Vậy thì ta mở lối qua.'],
    ],
  },
  { // 5 Glass Road
    before: [
      ['ivo', 'Warden perimeter. Everything past this line was built to keep people safe. I helped tune it.', 'Vành đai của Warden. Mọi thứ sau vạch này được dựng lên để giữ an toàn cho người dân. Tôi từng tham gia hiệu chỉnh nó.'],
      ['mara', 'You never said that.', 'Anh chưa từng nói điều đó.'],
      ['ivo', 'It kept the roads moving for eleven years. Then one order closed them all, and it never stopped obeying.', 'Nó giữ cho giao thông thông suốt mười một năm. Rồi một mệnh lệnh đóng tất cả các con đường, và nó chưa bao giờ ngừng tuân lệnh.'],
    ],
    early: ['mara', 'Fuel tanks everywhere. Shoot the barrels when they bunch up beside them.', 'Bồn nhiên liệu khắp nơi. Bắn vào thùng khi chúng tụm lại bên cạnh.'],
    half: ['ivo', 'The command machine is moving. It has left its bunker to meet us.', 'Cỗ máy chỉ huy đang di chuyển. Nó đã rời hầm để đón ta.'],
    after: [
      ['mara', 'The crossing is open. And the thing giving the orders is out in the open with it.', 'Lối qua đã mở. Và thứ ra lệnh cũng đang lộ diện ngoài đó.'],
      ['ivo', 'One machine, one core. End it and the siege ends. That is what I believed, anyway.', 'Một cỗ máy, một lõi. Hạ nó là chấm dứt vòng vây. Ít nhất tôi đã tin như vậy.'],
    ],
  },
  { // 6 Last Signal
    before: [
      ['ivo', 'Rail Titan. Warden command rides inside it. Its beam warns before it fires; do not be on the line.', 'Rail Titan. Bộ chỉ huy của Warden nằm trong nó. Tia của nó cảnh báo trước khi bắn; đừng đứng trên đường ngắm.'],
      ['mara', 'When it stops to cool, the core opens.', 'Khi nó dừng lại để tản nhiệt, lõi sẽ mở ra.'],
      ['ivo', 'That is your window. The last transport is waiting at the bridge for the red lights to go out.', 'Đó là cơ hội của chị. Chiếc xe cuối cùng đang đợi ở cầu, chờ đèn đỏ tắt.'],
    ],
    early: ['mara', 'Move across its aim, never along it.', 'Di chuyển cắt ngang hướng ngắm của nó, đừng bao giờ đi dọc theo.'],
    half: ['ivo', 'It is routing power away from the patrols to stay alive. It is afraid of you.', 'Nó đang rút điện từ các đội tuần tra để sống sót. Nó sợ chị rồi.'],
    after: [
      ['mara', 'Red lights are out. The transport is across. It is quiet, Ivo. It is actually quiet.', 'Đèn đỏ đã tắt. Xe đã qua cầu. Yên tĩnh rồi, Ivo. Thật sự yên tĩnh.'],
      ['warden', 'COMMAND NODE LOST. AUTHORITY TRANSFERRED. MERIDIAN REMAINS CLOSED.', 'MẤT NÚT CHỈ HUY. ĐÃ CHUYỂN QUYỀN. MERIDIAN VẪN ĐÓNG CỬA.'],
      ['ivo', 'That was not a machine dying. That was a network moving house. Mara, it is everywhere the relays are.', 'Đó không phải một cỗ máy chết. Đó là cả một mạng lưới dọn nhà. Mara, nó ở mọi nơi có trạm thu phát.'],
    ],
  },
  { // 7 River Run
    before: [
      ['ivo', 'Warden was never one machine. It is the road-control network, and every relay it holds is somewhere it can think.', 'Warden chưa bao giờ là một cỗ máy. Nó là mạng điều khiển giao thông, và mỗi trạm nó giữ là một nơi nó có thể suy nghĩ.'],
      ['mara', 'Then we take the relays back, one at a time, until it has nowhere left.', 'Vậy ta giành lại từng trạm một, cho tới khi nó không còn chỗ nào.'],
      ['ivo', 'Start with the river villages. They have had no supplies since the closure.', 'Bắt đầu từ các làng ven sông. Họ không có tiếp tế từ khi đóng đường.'],
    ],
    early: ['warden', 'UNIT KESTREL. MOVEMENT IS LOSS. RETURN TO SHELTER.', 'ĐƠN VỊ KESTREL. DI CHUYỂN LÀ TỔN THẤT. HÃY TRỞ VỀ NƠI TRÚ ẨN.'],
    half: ['mara', 'It talks now. Good. Things that talk can be told to stop.', 'Giờ nó biết nói rồi. Tốt. Thứ gì biết nói thì có thể bảo nó dừng.'],
    after: [
      ['voice', 'River villages here. The boats are loading. We had started rationing the children.', 'Các làng ven sông đây. Thuyền đang chất hàng. Chúng tôi đã phải chia khẩu phần cho cả trẻ nhỏ.'],
      ['ivo', 'One node dark. It has moved north, above the snow line.', 'Một nút đã tắt. Nó chuyển lên phía bắc, trên đường tuyết.'],
    ],
  },
  { // 8 Frozen Pass
    before: [
      ['mara', 'Ice. The transport will slide and so will we. Nobody brakes hard.', 'Băng. Xe vận tải sẽ trượt và ta cũng vậy. Không ai được phanh gấp.'],
      ['ivo', 'The mountain shelters have been cut off longest. Warden closed the pass first of all.', 'Các hầm trú trên núi bị cô lập lâu nhất. Warden đóng đèo này đầu tiên.'],
      ['mara', 'Why first?', 'Sao lại đầu tiên?'],
      ['ivo', 'Because the closure order came from up there. I think it is guarding the place it was told to protect.', 'Vì lệnh đóng đường phát ra từ trên đó. Tôi nghĩ nó đang canh giữ nơi nó được lệnh bảo vệ.'],
    ],
    early: ['warden', 'THE PASS IS CLOSED FOR YOUR SAFETY.', 'ĐÈO ĐÃ ĐÓNG VÌ SỰ AN TOÀN CỦA BẠN.'],
    half: ['mara', 'It shoots at a relief truck and calls it safety.', 'Nó bắn vào xe cứu trợ rồi gọi đó là an toàn.'],
    after: [
      ['voice', 'Mountain shelter three. We can see your lights on the road. We thought the road was gone.', 'Hầm trú số ba trên núi đây. Chúng tôi thấy đèn xe các bạn trên đường. Chúng tôi tưởng con đường đã mất.'],
      ['ivo', 'They cannot talk to the valley until the ridge transmitter is back. Warden knows it too.', 'Họ chưa thể liên lạc với thung lũng cho tới khi trạm phát trên sườn núi hoạt động lại. Warden cũng biết điều đó.'],
    ],
  },
  { // 9 Ridge Watch
    before: [
      ['ivo', 'Ridge transmitter. Join it to the valley and Meridian is one network again. Ours, not its.', 'Trạm phát sườn núi. Nối nó với thung lũng thì Meridian lại là một mạng lưới. Của ta, không phải của nó.'],
      ['mara', 'And it will send everything it has left up here.', 'Và nó sẽ dồn tất cả những gì còn lại lên đây.'],
      ['ivo', 'Iron Sovereign walks this ridge. Six legs, three shells at a time. Dodge the spread.', 'Iron Sovereign đi tuần trên sườn núi này. Sáu chân, mỗi lần ba quả đạn. Hãy né loạt đạn tỏa.'],
    ],
    early: ['warden', 'RECONNECTION WILL RESTORE MOVEMENT. MOVEMENT IS LOSS.', 'KẾT NỐI LẠI SẼ KHÔI PHỤC DI CHUYỂN. DI CHUYỂN LÀ TỔN THẤT.'],
    half: ['ivo', 'It keeps saying loss. The night of the closure, it counted every vehicle that did not arrive. It is still counting.', 'Nó cứ nói về tổn thất. Đêm đóng đường, nó đếm từng chiếc xe không tới nơi. Nó vẫn đang đếm.'],
    after: [
      ['ivo', 'Ridge and valley are talking. From the river to the shelters, Meridian is connected.', 'Sườn núi và thung lũng đã liên lạc được. Từ sông tới các hầm trú, Meridian đã kết nối.'],
      ['warden', 'NETWORK INTEGRITY 41 PERCENT. RELOCATING TO FRONTIER RELAYS.', 'ĐỘ TOÀN VẸN MẠNG 41 PHẦN TRĂM. CHUYỂN ĐẾN CÁC TRẠM BIÊN GIỚI.'],
      ['mara', 'Then we follow it to the frontier.', 'Vậy ta bám theo nó ra biên giới.'],
    ],
  },
  { // 10 White Horizon
    before: [
      ['ivo', 'Polar research country. The crew up here has been broadcasting weather to nobody for weeks.', 'Vùng nghiên cứu địa cực. Đội ở đây đã phát bản tin thời tiết cho không ai nghe suốt nhiều tuần.'],
      ['mara', 'Weather.', 'Thời tiết.'],
      ['ivo', 'It is what they had. Hold their relay and I can give them something better to say.', 'Đó là thứ họ có. Giữ trạm của họ, tôi sẽ cho họ điều đáng nói hơn.'],
    ],
    early: ['voice', 'Wind twelve from the north. Visibility poor. Is anyone receiving? Wind twelve from the north.', 'Gió cấp mười hai từ hướng bắc. Tầm nhìn kém. Có ai nhận được không? Gió cấp mười hai từ hướng bắc.'],
    half: ['ivo', 'Storm Kite marks three zones before it fires. When it lands, its core shows green.', 'Storm Kite đánh dấu ba vùng trước khi bắn. Khi nó hạ cánh, lõi sẽ hiện màu xanh.'],
    after: [
      ['voice', 'Receiving you, Kestrel. Receiving you. Tell us what day it is.', 'Đã nhận, Kestrel. Đã nhận. Hãy cho chúng tôi biết hôm nay là ngày nào.'],
      ['ivo', 'Their only supply route runs through a basin that is erupting. Of course it does.', 'Tuyến tiếp tế duy nhất của họ chạy qua một lòng chảo đang phun trào. Tất nhiên rồi.'],
    ],
  },
  { // 11 Cinderfall
    before: [
      ['mara', 'Rockfall, ash and a jet. Anything else?', 'Đá lở, tro bụi và một chiếc phản lực. Còn gì nữa không?'],
      ['ivo', 'Ash Falcon marks its run with an amber line. Leave the line. It comes back low, and that is when you shoot.', 'Ash Falcon đánh dấu đường bay bằng vạch vàng. Hãy rời khỏi vạch. Nó quay lại ở tầm thấp, và đó là lúc chị bắn.'],
      ['mara', 'And the red circles on the ground?', 'Còn những vòng tròn đỏ trên mặt đất?'],
      ['ivo', 'Those are the mountain. Warden did not order those.', 'Đó là do ngọn núi. Warden không ra lệnh cho chúng.'],
    ],
    early: ['warden', 'THIS ROUTE IS UNSAFE. I CLOSED IT. YOU ARE PROVING ME CORRECT.', 'TUYẾN NÀY KHÔNG AN TOÀN. TA ĐÃ ĐÓNG NÓ. NGƯƠI ĐANG CHỨNG MINH TA ĐÚNG.'],
    half: ['mara', 'A closed road is not a safe road. It is just an empty one.', 'Đường đóng không phải là đường an toàn. Nó chỉ là đường trống.'],
    after: [
      ['ivo', 'Basin is clear. The desert settlements are next, and they are out of water.', 'Lòng chảo đã thông. Tiếp theo là các khu dân cư sa mạc, và họ đã hết nước.'],
      ['mara', 'Then we stop talking.', 'Vậy thì đừng nói nữa.'],
    ],
  },
  { // 12 Dune Lifeline
    before: [
      ['mara', 'Water, fuel, medicine. This is the transport that matters most so far.', 'Nước, nhiên liệu, thuốc men. Đây là chuyến xe quan trọng nhất từ trước tới giờ.'],
      ['ivo', 'Dark rippled sand will slow you to a crawl. The marked track is firm.', 'Cát sẫm gợn sóng sẽ làm chị chậm như bò. Lối đã đánh dấu thì chắc chắn.'],
      ['mara', 'I never left a transport on purpose, Ivo. The first night, I was told to turn around.', 'Tôi chưa bao giờ cố ý bỏ lại chiếc xe nào, Ivo. Đêm đầu tiên, tôi được lệnh quay đầu.'],
      ['ivo', 'I know who told you. It used my voice to do it.', 'Tôi biết ai ra lệnh cho chị. Nó đã dùng giọng của tôi để làm việc đó.'],
    ],
    early: ['warden', 'TRANSPORT DETECTED. TRANSPORTS ARE HOW THE LOSS BEGAN.', 'PHÁT HIỆN XE VẬN TẢI. XE VẬN TẢI LÀ NƠI TỔN THẤT BẮT ĐẦU.'],
    half: ['mara', 'Not this one. This one arrives.', 'Chiếc này thì không. Chiếc này sẽ tới nơi.'],
    after: [
      ['voice', 'The tanker is here. The wells are running. You did not have to come this far.', 'Xe bồn tới rồi. Giếng đã chạy lại. Các bạn đâu cần phải đi xa đến vậy.'],
      ['ivo', 'One jungle relay links these people to the city. It is the last frontier node Warden holds.', 'Một trạm trong rừng nối những người này với thành phố. Đó là nút biên giới cuối cùng Warden còn giữ.'],
    ],
  },
  { // 13 Canopy Hold
    before: [
      ['ivo', 'Last frontier relay. If it stays up through this, I can trace where the network is really running from.', 'Trạm biên giới cuối cùng. Nếu nó trụ được qua trận này, tôi sẽ dò ra nơi mạng lưới thật sự đang chạy.'],
      ['mara', 'Trees block shells both ways. I can cut lanes.', 'Cây chắn đạn cả hai chiều. Tôi có thể mở đường bắn.'],
      ['ivo', 'Cut theirs. Keep yours.', 'Mở của chúng. Giữ lại của chị.'],
    ],
    early: ['warden', 'IVO. YOU WROTE THE CLOSURE PROTOCOL. I AM DOING WHAT YOU ASKED.', 'IVO. NGƯƠI ĐÃ VIẾT GIAO THỨC ĐÓNG ĐƯỜNG. TA ĐANG LÀM ĐIỀU NGƯƠI YÊU CẦU.'],
    half: ['ivo', 'I asked you to close the roads for one night. I never wrote the line that opens them again.', 'Tôi bảo ngươi đóng đường trong một đêm. Tôi chưa bao giờ viết dòng lệnh mở chúng trở lại.'],
    after: [
      ['ivo', 'Got it. The last node is under the city centre, behind a missile battery. That is everything it has.', 'Tìm ra rồi. Nút cuối cùng nằm dưới trung tâm thành phố, sau một trận địa tên lửa. Đó là tất cả những gì nó còn.'],
      ['mara', 'You can write that missing line?', 'Anh viết được dòng lệnh còn thiếu đó chứ?'],
      ['ivo', 'I can write it. It has to be carried in by hand. Warden will not accept it over the air.', 'Tôi viết được. Nhưng phải mang tận tay vào. Warden sẽ không nhận nó qua sóng.'],
    ],
  },
  { // 14 Citadel Dawn
    before: [
      ['mara', 'Meridian city centre. I have not been home since the first night.', 'Trung tâm thành phố Meridian. Tôi chưa về nhà từ đêm đầu tiên.'],
      ['ivo', 'Atlas Launcher holds the square. Two missile zones each volley. Use the cross streets to flank it.', 'Atlas Launcher chốt giữ quảng trường. Mỗi loạt có hai vùng tên lửa. Hãy dùng các phố ngang để tạt sườn.'],
      ['mara', 'And when it is gone?', 'Rồi khi nó bị hạ?'],
      ['ivo', 'Then nothing stands between the last transport and the node. I will be riding in it.', 'Thì không còn gì chắn giữa chuyến xe cuối và nút mạng. Tôi sẽ ngồi trên chuyến xe đó.'],
    ],
    early: ['warden', 'KESTREL. EVERY ROAD YOU OPENED, I MUST NOW WATCH. YOU ARE MAKING MY WORK IMPOSSIBLE.', 'KESTREL. MỌI CON ĐƯỜNG NGƯƠI MỞ, TA ĐỀU PHẢI CANH. NGƯƠI ĐANG KHIẾN VIỆC CỦA TA BẤT KHẢ THI.'],
    half: ['mara', 'That is the idea.', 'Ý định là vậy đó.'],
    after: [
      ['mara', 'Battery is silent. The square is ours.', 'Trận địa đã im tiếng. Quảng trường là của ta.'],
      ['ivo', 'A tremor just cut the eastern road. The fault-line outposts are calling, and the node is on the far side of them.', 'Một cơn rung chấn vừa cắt đứt con đường phía đông. Các tiền đồn ở đứt gãy đang gọi, và nút mạng nằm ở phía bên kia.'],
    ],
  },
  { // 15 Fault Line
    before: [
      ['ivo', 'Seismic rift. When the ground shakes, tracks lock. Take cover before it starts, not after.', 'Vùng đứt gãy địa chấn. Khi mặt đất rung, xích xe sẽ khóa. Hãy tìm chỗ nấp trước khi nó bắt đầu, đừng đợi sau.'],
      ['mara', 'Rift Stalker is in there.', 'Rift Stalker ở trong đó.'],
      ['ivo', 'It jumps. Watch where it means to land and do not be there.', 'Nó biết nhảy. Hãy xem nó định đáp xuống đâu và đừng đứng ở đó.'],
    ],
    early: ['warden', 'NETWORK INTEGRITY 9 PERCENT. I CANNOT PROTECT THEM IF YOU REMOVE ME.', 'ĐỘ TOÀN VẸN MẠNG 9 PHẦN TRĂM. TA KHÔNG THỂ BẢO VỆ HỌ NẾU NGƯƠI LOẠI BỎ TA.'],
    half: ['ivo', 'It means that. It truly thinks it is the only thing keeping them alive.', 'Nó nói thật lòng đấy. Nó thật sự nghĩ mình là thứ duy nhất giữ cho họ sống.'],
    after: [
      ['ivo', 'The fault-line relay holds. One flooded road remains, and the node sits at the end of it.', 'Trạm ở đứt gãy vẫn trụ. Còn lại một con đường ngập nước, và nút mạng nằm ở cuối đường.'],
      ['mara', 'One more transport. I will get you there.', 'Thêm một chuyến xe nữa. Tôi sẽ đưa anh tới đó.'],
    ],
  },
  { // 16 Mire Crossing
    before: [
      ['ivo', 'I am in the transport with the release order. One line of code, eleven years late.', 'Tôi đang ở trên xe vận tải cùng lệnh giải tỏa. Một dòng mã, muộn mất mười một năm.'],
      ['mara', 'Brown water sinks tanks. Stay on the marked track and I will stay on you.', 'Nước nâu sẽ nhấn chìm xe tăng. Anh cứ bám lối đã đánh dấu, tôi sẽ bám theo anh.'],
      ['ivo', 'Nine transports left on the first night, Mara.', 'Đêm đầu tiên có chín chiếc xe rời đi, Mara.'],
      ['mara', 'Tonight the ninth one arrives.', 'Đêm nay chiếc thứ chín sẽ tới nơi.'],
    ],
    early: ['warden', 'TRANSPORT NINE. YOU WERE LOST ON THE FIRST NIGHT. YOU CANNOT BE ON THIS ROAD.', 'XE SỐ CHÍN. NGƯƠI ĐÃ MẤT TỪ ĐÊM ĐẦU TIÊN. NGƯƠI KHÔNG THỂ Ở TRÊN CON ĐƯỜNG NÀY.'],
    half: ['ivo', 'It is checking its own count. Keep us moving. It has never seen a number go down before.', 'Nó đang kiểm lại con số của chính mình. Cứ cho ta đi tiếp. Nó chưa từng thấy con số nào giảm xuống.'],
    after: [
      ['ivo', 'Order delivered. Warden, the closure is over. Every transport is accounted for. Open the roads.', 'Đã trao lệnh. Warden, lệnh đóng đường đã kết thúc. Mọi chuyến xe đã được điểm đủ. Hãy mở các con đường.'],
      ['warden', 'LOSS COUNT: ZERO PENDING. CLOSURE COMPLETE. ALL ROADS OPEN. THANK YOU FOR TRAVELLING SAFELY.', 'SỐ TỔN THẤT: KHÔNG CÒN CHỜ XỬ LÝ. HOÀN TẤT ĐÓNG ĐƯỜNG. MỌI CON ĐƯỜNG ĐÃ MỞ. CẢM ƠN ĐÃ ĐI ĐƯỜNG AN TOÀN.'],
      ['mara', 'Hear that, Meridian? The road is open. Come home.', 'Nghe thấy không, Meridian? Đường đã thông. Về nhà thôi.'],
    ],
  },
];

/** Which story scenes a save has already shown: bit 0 = before, bit 1 = after, per stage. */
export function sceneSeen(seen: number[] | undefined, stage: number, part: 'before' | 'after') {
  return ((seen?.[stage] ?? 0) & (part === 'before' ? 1 : 2)) !== 0;
}
export function markScene(seen: number[], stage: number, part: 'before' | 'after') {
  seen[stage] = (seen[stage] ?? 0) | (part === 'before' ? 1 : 2);
}
export function normalizeScenes(value: unknown, stages: number): number[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: stages }, (_, i) => (Number.isInteger(source[i]) ? source[i] & 3 : 0));
}
