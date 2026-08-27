# Kho công thức Lark Base — Apple NPI Testing HCM 27.08

- Nguồn: `Apple _ NPI Testing HCM 27.08.base`
- SHA-256: `a9ab514c9e4d9d62ea311764e5c9eb297c149ed02b71dda2ea9873ac4633e63c`
- Ngày tổng hợp: `2026-08-27T04:37:16.652Z`
- Số bảng có công thức: **14**
- Số công thức có nội dung: **234**
- Số trường Formula/Lookup đang trống: **11**

> Công thức dễ đọc đã đổi ID nội bộ thành tên bảng và tên trường. Biểu thức gốc được giữ nguyên để đối chiếu chính xác với file xuất.

## Cảnh báo tham chiếu không phân giải

Các ID sau được giữ nguyên vì đối tượng không còn trong schema của file xuất:

- `fldqUkixLC`
- `tblU2AfKU0y3gtUe`

## Mục lục

- [(Case 0) Master_DS](#table-tblczttew6zk1rqi) — 18 công thức
- [(Case 1) Master_DS](#table-tblojey807akydx8) — 18 công thức
- [(Case 2) Master_DS](#table-tblotm0nei83jwvb) — 18 công thức
- [(Case 3) Master_DS](#table-tblcni6jypulfkhe) — 18 công thức
- [Danh sách đơn hàng](#table-tbldxeatbg7vmovr) — 3 công thức
- [DS Máy thu cũ](#table-tblkcnh5fdioxrnq) — 1 công thức
- [Master](#table-tblrvlibf3jwwu6s) — 35 công thức
- [Master_Check in](#table-tbl8ch0cficx9nqv) — 34 công thức
- [Master_Danh sách đơn hàng](#table-tblhozh6vyi1wjzy) — 3 công thức
- [Master_DS](#table-tblonzbvzqxqiq1n) — 18 công thức
- [Master_Điều phối](#table-tbll7mrklpsgg0vv) — 18 công thức
- [NPI TEST_ Kết quả bài làm](#table-tblwjezzr6tkw0wy) — 42 công thức
- [NPI_Bài làm](#table-tblqydivgps4zesf) — 1 công thức
- [STT + Status](#table-tblts5i2slutv2fm) — 7 công thức

<a id="table-tblczttew6zk1rqi"></a>

## (Case 0) Master_DS

- Table ID: `tblCzTTEW6zK1RqI`
- Công thức có nội dung: **18**

### Sl đã điều phối

- Field ID: `fldK1eNXXi`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[DS Thu cũ]=[STT bàn]||CurrentValue.[DS Tư vấn]=[STT bàn]||CurrentValue.[DS Backup]=[STT bàn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]||CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]||CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]).$column[fld7MVTZRT].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### DS_TV_Dash

- Field ID: `fld2TfmBFa`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblCzTTEW6zK1RqI].$field[fldLceRTKF]="Đang tư vấn",1,0)
```

</details>

### Trạng thái gần nhất (helper)

- Field ID: `fldzEmIei5`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Trạng thái], TRUE)
          .[Trạng thái]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt], TRUE)
          .$column[fldIIitGRt]
)
```

</details>

### TG gần nhất

- Field ID: `fldbh4uyRu`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).SORTBY([Master].[Mã TC],FALSE).[Thời gian])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldXDIHbwi],FALSE).$column[fldZEk8hFO])
```

</details>

### Sl khách chờ

- Field ID: `fldXbnPUJi`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl đã điều phối]= [Sl TV đã tiếp nhận],0,MAX(0,[Sl đã điều phối]-[Sl TV đã tiếp nhận]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblCzTTEW6zK1RqI].$field[fldK1eNXXi]= bitable::$table[tblCzTTEW6zK1RqI].$field[fldyGgztEQ],0,MAX(0,bitable::$table[tblCzTTEW6zK1RqI].$field[fldK1eNXXi]-bitable::$table[tblCzTTEW6zK1RqI].$field[fldyGgztEQ]))
```

</details>

### Khách gần nhất (helper)

- Field ID: `fldHd9nqbt`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[STT], FALSE)
          .[Họ và tên]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldcLHVBDh], FALSE)
          .$column[fldXor29jl]
)
```

</details>

### Trạng thái hiện tại (kết quả chính)

- Field ID: `fldLceRTKF`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master].COUNTIF(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])=0,"Chưa có dữ liệu",IF([Trạng thái gần nhất (helper)]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblrVLIbf3JWwu6s].COUNTIF(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm])=0,"Chưa có dữ liệu",IF(bitable::$table[tblCzTTEW6zK1RqI].$field[fldzEmIei5]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

</details>

### STT tiếp theo

- Field ID: `fldxG0Lbhr`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(
  CurrentValue.[Thứ tự bản ghi] = [TT_min]
).[STT input]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(
  CurrentValue.$column[flduWr1tYp] = bitable::$table[tblCzTTEW6zK1RqI].$field[fldaaybIyk]
).$column[fldiJpcGUT]
```

</details>

### TT_min

- Field ID: `fldaaybIyk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  COUNTA(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  )>0,
  MIN(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  ),
  "Unk"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  COUNTA(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  )>0,
  MIN(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  ),
  "Unk"
)
```

</details>

### Dự kiến kết thúc

- Field ID: `fldfm5RdMH`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",[TG gần nhất]+DURATION(0,0,ROUND([Leadtime trung bình],0),0),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblCzTTEW6zK1RqI].$field[fldLceRTKF]="Đang tư vấn",bitable::$table[tblCzTTEW6zK1RqI].$field[fldbh4uyRu]+DURATION(0,0,ROUND(bitable::$table[tblCzTTEW6zK1RqI].$field[fldstWfhnj],0),0),"")
```

</details>

### Sl TV đang tiếp nhận

- Field ID: `fldavHNrMM`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl TV đã tiếp nhận]>[Sl TV hoàn tất],[Sl TV đã tiếp nhận]-[Sl TV hoàn tất],0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblCzTTEW6zK1RqI].$field[fldyGgztEQ]>bitable::$table[tblCzTTEW6zK1RqI].$field[fldYbqBChA],bitable::$table[tblCzTTEW6zK1RqI].$field[fldyGgztEQ]-bitable::$table[tblCzTTEW6zK1RqI].$field[fldYbqBChA],0)
```

</details>

### STT gần nhất (helper)

- Field ID: `fldVikLa0p`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Thời gian], FALSE)
          .[STT]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
          .$column[fldcLHVBDh]
)
```

</details>

### NPI_AIO_User

- Field ID: `fldoVOBCT3`
- Loại: `Formula`

Công thức theo tên:

```text
[MSNV]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblCzTTEW6zK1RqI].$field[fldHw877Vj]
```

</details>

### Leadtime trung bình

- Field ID: `fldstWfhnj`
- Loại: `Formula`

Công thức theo tên:

```text
IF(ISNULL([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE()),"",
  ROUNDDOWN([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),0) & " Phút " &
  ROUND(MOD([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),1)*60,0) & " Giây"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(ISNULL(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE()),"",
  ROUNDDOWN(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),0) & " Phút " &
  ROUND(MOD(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),1)*60,0) & " Giây"
)
```

</details>

### Sl TV đã tiếp nhận

- Field ID: `fldyGgztEQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Tiếp nhận"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optiFjhcAs]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().COUNTA()
```

</details>

### Sl TV hoàn tất

- Field ID: `fldYbqBChA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Hoàn tất"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optxUoQwNe]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblCzTTEW6zK1RqI].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### NPI_AIO_Pass

- Field ID: `fldQ9bV60M`
- Loại: `Formula`

Công thức theo tên:

```text
right([NPI_AIO_User],5)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
right(bitable::$table[tblCzTTEW6zK1RqI].$field[fldoVOBCT3],5)
```

</details>

### MSNV

- Field ID: `fldHw877Vj`
- Loại: `Formula`

Công thức theo tên:

```text
[NV Tư vấn.ID nhân viên]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblCzTTEW6zK1RqI].$field[fldJ11crSq]
```

</details>

### Trường Formula/Lookup đang trống

- `Hyperlink tiếp nhận` — `fldamAMKs6` — Formula
- `Hyperlink hoàn tất` — `fldTaQpzKa` — Formula


<a id="table-tblojey807akydx8"></a>

## (Case 1) Master_DS

- Table ID: `tbloJeY807AKydx8`
- Công thức có nội dung: **18**

### DS_TV_Dash

- Field ID: `fld2TfmBFa`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloJeY807AKydx8].$field[fldLceRTKF]="Đang tư vấn",1,0)
```

</details>

### NPI_AIO_Pass

- Field ID: `fldQ9bV60M`
- Loại: `Formula`

Công thức theo tên:

```text
right([NPI_AIO_User],5)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
right(bitable::$table[tbloJeY807AKydx8].$field[fldoVOBCT3],5)
```

</details>

### MSNV

- Field ID: `fldHw877Vj`
- Loại: `Formula`

Công thức theo tên:

```text
[NV Tư vấn.ID nhân viên]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloJeY807AKydx8].$field[fldJ11crSq]
```

</details>

### Khách gần nhất (helper)

- Field ID: `fldHd9nqbt`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[STT], FALSE)
          .[Họ và tên]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldcLHVBDh], FALSE)
          .$column[fldXor29jl]
)
```

</details>

### NPI_AIO_User

- Field ID: `fldoVOBCT3`
- Loại: `Formula`

Công thức theo tên:

```text
[MSNV]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloJeY807AKydx8].$field[fldHw877Vj]
```

</details>

### STT tiếp theo

- Field ID: `fldxG0Lbhr`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(
  CurrentValue.[Thứ tự bản ghi] = [TT_min]
).[STT input]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(
  CurrentValue.$column[flduWr1tYp] = bitable::$table[tbloJeY807AKydx8].$field[fldaaybIyk]
).$column[fldiJpcGUT]
```

</details>

### TT_min

- Field ID: `fldaaybIyk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  COUNTA(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  )>0,
  MIN(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  ),
  "Unk"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  COUNTA(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  )>0,
  MIN(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  ),
  "Unk"
)
```

</details>

### Sl TV đã tiếp nhận

- Field ID: `fldyGgztEQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Tiếp nhận"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optiFjhcAs]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().COUNTA()
```

</details>

### TG gần nhất

- Field ID: `fldbh4uyRu`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).SORTBY([Master].[Mã TC],FALSE).[Thời gian])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldXDIHbwi],FALSE).$column[fldZEk8hFO])
```

</details>

### Sl đã điều phối

- Field ID: `fldK1eNXXi`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[DS Thu cũ]=[STT bàn]||CurrentValue.[DS Tư vấn]=[STT bàn]||CurrentValue.[DS Backup]=[STT bàn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]||CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]||CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]).$column[fld7MVTZRT].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Sl TV hoàn tất

- Field ID: `fldYbqBChA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Hoàn tất"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optxUoQwNe]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Sl khách chờ

- Field ID: `fldXbnPUJi`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl đã điều phối]= [Sl TV đã tiếp nhận],0,MAX(0,[Sl đã điều phối]-[Sl TV đã tiếp nhận]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloJeY807AKydx8].$field[fldK1eNXXi]= bitable::$table[tbloJeY807AKydx8].$field[fldyGgztEQ],0,MAX(0,bitable::$table[tbloJeY807AKydx8].$field[fldK1eNXXi]-bitable::$table[tbloJeY807AKydx8].$field[fldyGgztEQ]))
```

</details>

### Leadtime trung bình

- Field ID: `fldstWfhnj`
- Loại: `Formula`

Công thức theo tên:

```text
IF(ISNULL([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE()),"",
  ROUNDDOWN([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),0) & " Phút " &
  ROUND(MOD([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),1)*60,0) & " Giây"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(ISNULL(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE()),"",
  ROUNDDOWN(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),0) & " Phút " &
  ROUND(MOD(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),1)*60,0) & " Giây"
)
```

</details>

### Sl TV đang tiếp nhận

- Field ID: `fldavHNrMM`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl TV đã tiếp nhận]>[Sl TV hoàn tất],[Sl TV đã tiếp nhận]-[Sl TV hoàn tất],0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloJeY807AKydx8].$field[fldyGgztEQ]>bitable::$table[tbloJeY807AKydx8].$field[fldYbqBChA],bitable::$table[tbloJeY807AKydx8].$field[fldyGgztEQ]-bitable::$table[tbloJeY807AKydx8].$field[fldYbqBChA],0)
```

</details>

### Trạng thái gần nhất (helper)

- Field ID: `fldzEmIei5`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Trạng thái], TRUE)
          .[Trạng thái]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt], TRUE)
          .$column[fldIIitGRt]
)
```

</details>

### Trạng thái hiện tại (kết quả chính)

- Field ID: `fldLceRTKF`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master].COUNTIF(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])=0,"Chưa có dữ liệu",IF([Trạng thái gần nhất (helper)]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblrVLIbf3JWwu6s].COUNTIF(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm])=0,"Chưa có dữ liệu",IF(bitable::$table[tbloJeY807AKydx8].$field[fldzEmIei5]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

</details>

### Dự kiến kết thúc

- Field ID: `fldfm5RdMH`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",[TG gần nhất]+DURATION(0,0,ROUND([Leadtime trung bình],0),0),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloJeY807AKydx8].$field[fldLceRTKF]="Đang tư vấn",bitable::$table[tbloJeY807AKydx8].$field[fldbh4uyRu]+DURATION(0,0,ROUND(bitable::$table[tbloJeY807AKydx8].$field[fldstWfhnj],0),0),"")
```

</details>

### STT gần nhất (helper)

- Field ID: `fldVikLa0p`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Thời gian], FALSE)
          .[STT]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloJeY807AKydx8].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
          .$column[fldcLHVBDh]
)
```

</details>

### Trường Formula/Lookup đang trống

- `Hyperlink tiếp nhận` — `fldamAMKs6` — Formula
- `Hyperlink hoàn tất` — `fldTaQpzKa` — Formula


<a id="table-tblotm0nei83jwvb"></a>

## (Case 2) Master_DS

- Table ID: `tblOTm0NeI83JWVB`
- Công thức có nội dung: **18**

### TT_min

- Field ID: `fldaaybIyk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  COUNTA(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  )>0,
  MIN(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  ),
  "Unk"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  COUNTA(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  )>0,
  MIN(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  ),
  "Unk"
)
```

</details>

### Sl TV hoàn tất

- Field ID: `fldYbqBChA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Hoàn tất"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optxUoQwNe]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Trạng thái hiện tại (kết quả chính)

- Field ID: `fldLceRTKF`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master].COUNTIF(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])=0,"Chưa có dữ liệu",IF([Trạng thái gần nhất (helper)]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblrVLIbf3JWwu6s].COUNTIF(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm])=0,"Chưa có dữ liệu",IF(bitable::$table[tblOTm0NeI83JWVB].$field[fldzEmIei5]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

</details>

### Leadtime trung bình

- Field ID: `fldstWfhnj`
- Loại: `Formula`

Công thức theo tên:

```text
IF(ISNULL([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE()),"",
  ROUNDDOWN([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),0) & " Phút " &
  ROUND(MOD([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),1)*60,0) & " Giây"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(ISNULL(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE()),"",
  ROUNDDOWN(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),0) & " Phút " &
  ROUND(MOD(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),1)*60,0) & " Giây"
)
```

</details>

### NPI_AIO_Pass

- Field ID: `fldQ9bV60M`
- Loại: `Formula`

Công thức theo tên:

```text
right([NPI_AIO_User],5)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
right(bitable::$table[tblOTm0NeI83JWVB].$field[fldoVOBCT3],5)
```

</details>

### Sl TV đã tiếp nhận

- Field ID: `fldyGgztEQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Tiếp nhận"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optiFjhcAs]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().COUNTA()
```

</details>

### Sl TV đang tiếp nhận

- Field ID: `fldavHNrMM`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl TV đã tiếp nhận]>[Sl TV hoàn tất],[Sl TV đã tiếp nhận]-[Sl TV hoàn tất],0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblOTm0NeI83JWVB].$field[fldyGgztEQ]>bitable::$table[tblOTm0NeI83JWVB].$field[fldYbqBChA],bitable::$table[tblOTm0NeI83JWVB].$field[fldyGgztEQ]-bitable::$table[tblOTm0NeI83JWVB].$field[fldYbqBChA],0)
```

</details>

### NPI_AIO_User

- Field ID: `fldoVOBCT3`
- Loại: `Formula`

Công thức theo tên:

```text
[MSNV]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblOTm0NeI83JWVB].$field[fldHw877Vj]
```

</details>

### STT tiếp theo

- Field ID: `fldxG0Lbhr`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(
  CurrentValue.[Thứ tự bản ghi] = [TT_min]
).[STT input]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(
  CurrentValue.$column[flduWr1tYp] = bitable::$table[tblOTm0NeI83JWVB].$field[fldaaybIyk]
).$column[fldiJpcGUT]
```

</details>

### TG gần nhất

- Field ID: `fldbh4uyRu`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).SORTBY([Master].[Mã TC],FALSE).[Thời gian])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldXDIHbwi],FALSE).$column[fldZEk8hFO])
```

</details>

### Khách gần nhất (helper)

- Field ID: `fldHd9nqbt`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[STT], FALSE)
          .[Họ và tên]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldcLHVBDh], FALSE)
          .$column[fldXor29jl]
)
```

</details>

### DS_TV_Dash

- Field ID: `fld2TfmBFa`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblOTm0NeI83JWVB].$field[fldLceRTKF]="Đang tư vấn",1,0)
```

</details>

### Trạng thái gần nhất (helper)

- Field ID: `fldzEmIei5`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Trạng thái], TRUE)
          .[Trạng thái]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt], TRUE)
          .$column[fldIIitGRt]
)
```

</details>

### Dự kiến kết thúc

- Field ID: `fldfm5RdMH`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",[TG gần nhất]+DURATION(0,0,ROUND([Leadtime trung bình],0),0),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblOTm0NeI83JWVB].$field[fldLceRTKF]="Đang tư vấn",bitable::$table[tblOTm0NeI83JWVB].$field[fldbh4uyRu]+DURATION(0,0,ROUND(bitable::$table[tblOTm0NeI83JWVB].$field[fldstWfhnj],0),0),"")
```

</details>

### Sl khách chờ

- Field ID: `fldXbnPUJi`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl đã điều phối]= [Sl TV đã tiếp nhận],0,MAX(0,[Sl đã điều phối]-[Sl TV đã tiếp nhận]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblOTm0NeI83JWVB].$field[fldK1eNXXi]= bitable::$table[tblOTm0NeI83JWVB].$field[fldyGgztEQ],0,MAX(0,bitable::$table[tblOTm0NeI83JWVB].$field[fldK1eNXXi]-bitable::$table[tblOTm0NeI83JWVB].$field[fldyGgztEQ]))
```

</details>

### STT gần nhất (helper)

- Field ID: `fldVikLa0p`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Thời gian], FALSE)
          .[STT]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblOTm0NeI83JWVB].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
          .$column[fldcLHVBDh]
)
```

</details>

### Sl đã điều phối

- Field ID: `fldK1eNXXi`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[DS Thu cũ]=[STT bàn]||CurrentValue.[DS Tư vấn]=[STT bàn]||CurrentValue.[DS Backup]=[STT bàn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]||CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]||CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblOTm0NeI83JWVB].$field[fld5rSOixW]).$column[fld7MVTZRT].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### MSNV

- Field ID: `fldHw877Vj`
- Loại: `Formula`

Công thức theo tên:

```text
[NV Tư vấn.ID nhân viên]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblOTm0NeI83JWVB].$field[fldJ11crSq]
```

</details>

### Trường Formula/Lookup đang trống

- `Hyperlink hoàn tất` — `fldTaQpzKa` — Formula
- `Hyperlink tiếp nhận` — `fldamAMKs6` — Formula


<a id="table-tblcni6jypulfkhe"></a>

## (Case 3) Master_DS

- Table ID: `tblcnI6JyPUlfKhE`
- Công thức có nội dung: **18**

### Sl đã điều phối

- Field ID: `fldK1eNXXi`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[DS Thu cũ]=[STT bàn]||CurrentValue.[DS Tư vấn]=[STT bàn]||CurrentValue.[DS Backup]=[STT bàn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]||CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]||CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]).$column[fld7MVTZRT].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Khách gần nhất (helper)

- Field ID: `fldHd9nqbt`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[STT], FALSE)
          .[Họ và tên]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldcLHVBDh], FALSE)
          .$column[fldXor29jl]
)
```

</details>

### Leadtime trung bình

- Field ID: `fldstWfhnj`
- Loại: `Formula`

Công thức theo tên:

```text
IF(ISNULL([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE()),"",
  ROUNDDOWN([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),0) & " Phút " &
  ROUND(MOD([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),1)*60,0) & " Giây"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(ISNULL(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE()),"",
  ROUNDDOWN(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),0) & " Phút " &
  ROUND(MOD(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),1)*60,0) & " Giây"
)
```

</details>

### STT tiếp theo

- Field ID: `fldxG0Lbhr`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(
  CurrentValue.[Thứ tự bản ghi] = [TT_min]
).[STT input]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(
  CurrentValue.$column[flduWr1tYp] = bitable::$table[tblcnI6JyPUlfKhE].$field[fldaaybIyk]
).$column[fldiJpcGUT]
```

</details>

### NPI_AIO_Pass

- Field ID: `fldQ9bV60M`
- Loại: `Formula`

Công thức theo tên:

```text
right([NPI_AIO_User],5)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
right(bitable::$table[tblcnI6JyPUlfKhE].$field[fldoVOBCT3],5)
```

</details>

### Sl TV đã tiếp nhận

- Field ID: `fldyGgztEQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Tiếp nhận"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optiFjhcAs]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().COUNTA()
```

</details>

### Trạng thái hiện tại (kết quả chính)

- Field ID: `fldLceRTKF`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master].COUNTIF(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])=0,"Chưa có dữ liệu",IF([Trạng thái gần nhất (helper)]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblrVLIbf3JWwu6s].COUNTIF(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm])=0,"Chưa có dữ liệu",IF(bitable::$table[tblcnI6JyPUlfKhE].$field[fldzEmIei5]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

</details>

### Sl TV đang tiếp nhận

- Field ID: `fldavHNrMM`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl TV đã tiếp nhận]>[Sl TV hoàn tất],[Sl TV đã tiếp nhận]-[Sl TV hoàn tất],0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblcnI6JyPUlfKhE].$field[fldyGgztEQ]>bitable::$table[tblcnI6JyPUlfKhE].$field[fldYbqBChA],bitable::$table[tblcnI6JyPUlfKhE].$field[fldyGgztEQ]-bitable::$table[tblcnI6JyPUlfKhE].$field[fldYbqBChA],0)
```

</details>

### TG gần nhất

- Field ID: `fldbh4uyRu`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).SORTBY([Master].[Mã TC],FALSE).[Thời gian])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fld5rSOixW]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldXDIHbwi],FALSE).$column[fldZEk8hFO])
```

</details>

### DS_TV_Dash

- Field ID: `fld2TfmBFa`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblcnI6JyPUlfKhE].$field[fldLceRTKF]="Đang tư vấn",1,0)
```

</details>

### Sl TV hoàn tất

- Field ID: `fldYbqBChA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Hoàn tất"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optxUoQwNe]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### MSNV

- Field ID: `fldHw877Vj`
- Loại: `Formula`

Công thức theo tên:

```text
[NV Tư vấn.ID nhân viên]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblcnI6JyPUlfKhE].$field[fldJ11crSq]
```

</details>

### Dự kiến kết thúc

- Field ID: `fldfm5RdMH`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",[TG gần nhất]+DURATION(0,0,ROUND([Leadtime trung bình],0),0),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblcnI6JyPUlfKhE].$field[fldLceRTKF]="Đang tư vấn",bitable::$table[tblcnI6JyPUlfKhE].$field[fldbh4uyRu]+DURATION(0,0,ROUND(bitable::$table[tblcnI6JyPUlfKhE].$field[fldstWfhnj],0),0),"")
```

</details>

### NPI_AIO_User

- Field ID: `fldoVOBCT3`
- Loại: `Formula`

Công thức theo tên:

```text
[MSNV]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblcnI6JyPUlfKhE].$field[fldHw877Vj]
```

</details>

### STT gần nhất (helper)

- Field ID: `fldVikLa0p`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Thời gian], FALSE)
          .[STT]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
          .$column[fldcLHVBDh]
)
```

</details>

### Trạng thái gần nhất (helper)

- Field ID: `fldzEmIei5`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST(
  [Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])
          .SORTBY([Master].[Trạng thái], TRUE)
          .[Trạng thái]
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm])
          .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt], TRUE)
          .$column[fldIIitGRt]
)
```

</details>

### TT_min

- Field ID: `fldaaybIyk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  COUNTA(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  )>0,
  MIN(
    [Master_Điều phối].FILTER(
      OR(
        CurrentValue.[DS Tư vấn]=[Selection-Tư vấn] && CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",

        CurrentValue.[DS Thu cũ]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",
          CurrentValue.[Status in thu cũ]="Không thu cũ"
        ),

        CurrentValue.[DS Backup]=[Selection-Tư vấn] &&
        OR(
          CurrentValue.[Status in backup]="Chưa tiếp nhận",
          CurrentValue.[Status in backup]="Không backup",
          CurrentValue.[Status in backup]="Check backup"
        )
      )
    ).[Thứ tự bản ghi]
  ),
  "Unk"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  COUNTA(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  )>0,
  MIN(
    bitable::$table[tbll7MRKLPSgG0vV].FILTER(
      OR(
        CurrentValue.$column[fldhvgL0d9]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] && CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",

        CurrentValue.$column[fld0Z1nlar]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",
          CurrentValue.$column[fldDj1873T]="Không thu cũ"
        ),

        CurrentValue.$column[fldLWBBwTv]=bitable::$table[tblcnI6JyPUlfKhE].$field[fldr2l8Nfm] &&
        OR(
          CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",
          CurrentValue.$column[fld4rEDKuK]="Không backup",
          CurrentValue.$column[fld4rEDKuK]="Check backup"
        )
      )
    ).$column[flduWr1tYp]
  ),
  "Unk"
)
```

</details>

### Sl khách chờ

- Field ID: `fldXbnPUJi`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl đã điều phối]= [Sl TV đã tiếp nhận],0,MAX(0,[Sl đã điều phối]-[Sl TV đã tiếp nhận]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblcnI6JyPUlfKhE].$field[fldK1eNXXi]= bitable::$table[tblcnI6JyPUlfKhE].$field[fldyGgztEQ],0,MAX(0,bitable::$table[tblcnI6JyPUlfKhE].$field[fldK1eNXXi]-bitable::$table[tblcnI6JyPUlfKhE].$field[fldyGgztEQ]))
```

</details>

### Trường Formula/Lookup đang trống

- `Hyperlink hoàn tất` — `fldTaQpzKa` — Formula
- `Hyperlink tiếp nhận` — `fldamAMKs6` — Formula


<a id="table-tbldxeatbg7vmovr"></a>

## Danh sách đơn hàng

- Table ID: `tbldXEATBg7vmOVR`
- Công thức có nội dung: **3**

### CI_STT

- Field ID: `fldG086i9n`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[STT + Status].FILTER(CurrentValue.[SDT]=[SDT]).[Selection_STT].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblTS5i2slUtV2Fm].FILTER(CurrentValue.$column[fldoFA95lO]=bitable::$table[tbldXEATBg7vmOVR].$field[fldzAHyox9]).$column[fldKypZwzl].LISTCOMBINE()
```

</details>

### Phụ_TT XH

- Field ID: `fld5XZ70ah`
- Loại: `Formula`

Công thức theo tên:

```text
[Danh sách đơn hàng].COUNTIF(CurrentValue.[SDT]=[SDT]&&CurrentValue.[Phụ_STT]<=[Phụ_STT])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbldXEATBg7vmOVR].COUNTIF(CurrentValue.$column[fldzAHyox9]=bitable::$table[tbldXEATBg7vmOVR].$field[fldzAHyox9]&&CurrentValue.$column[fldUR38lnc]<=bitable::$table[tbldXEATBg7vmOVR].$field[fldUR38lnc])
```

</details>

### SDT_STT

- Field ID: `fldxxs69Cn`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE([SDT],"_",[Phụ_TT XH])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(bitable::$table[tbldXEATBg7vmOVR].$field[fldzAHyox9],"_",bitable::$table[tbldXEATBg7vmOVR].$field[fld5XZ70ah])
```

</details>


<a id="table-tblkcnh5fdioxrnq"></a>

## DS Máy thu cũ

- Table ID: `tblKcnh5FDIOXrnq`
- Công thức có nội dung: **1**

### Check bàn giao

- Field ID: `fldpiwXJv8`
- Loại: `Formula`

Công thức theo tên:

```text
IF(AND([Hình nghiệm thu máy cũ].ISNULL().NOT(),[Scan QR máy cũ].CONTAINTEXT("MTC").NOT()),1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(AND(bitable::$table[tblKcnh5FDIOXrnq].$field[fldWzcV5k1].ISNULL().NOT(),bitable::$table[tblKcnh5FDIOXrnq].$field[fldcTC37wT].CONTAINTEXT("MTC").NOT()),1,0)
```

</details>


<a id="table-tblrvlibf3jwwu6s"></a>

## Master

- Table ID: `tblrVLIbf3JWwu6s`
- Công thức có nội dung: **35**

### Status thu máy cũ

- Field ID: `fldhuPQH9m`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Check nghiệm thu].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldEHYOISD].LISTCOMBINE().UNIQUE()
```

</details>

### Scan QR máy cũ (1)

- Field ID: `fldrsbIB9T`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[DS Máy thu cũ].FILTER(CurrentValue.[STT]=[STT]).[Scan QR máy cũ].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblKcnh5FDIOXrnq].FILTER(CurrentValue.$column[fldgSx4RFF]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldcTC37wT].LISTCOMBINE().UNIQUE()
```

</details>

### Xác nhận đã bàn giao

- Field ID: `fldbItGY9G`
- Loại: `Formula`

Công thức theo tên:

```text
IF(AND(ISBLANK([Scan QR NV bàn giao]).NOT(),ISBLANK([Chụp hình nghiệm thu]).NOT()),1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(AND(ISBLANK(bitable::$table[tblrVLIbf3JWwu6s].$field[fldBy6ibCc]).NOT(),ISBLANK(bitable::$table[tblrVLIbf3JWwu6s].$field[fld0Iw04vt]).NOT()),1,0)
```

</details>

### SP 1

- Field ID: `fldBgwzLV1`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 1].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldkRED68l].LISTCOMBINE()
```

</details>

### SP 4

- Field ID: `fldDYxQwew`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 4].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldecG1ua9].LISTCOMBINE()
```

</details>

### Đi tiền

- Field ID: `fldFE6maq3`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Đi tiền].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[flds7jXibc].LISTCOMBINE().UNIQUE()
```

</details>

### Brower Time

- Field ID: `fldZ7BGZL2`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE(FLOOR([Brower Leadtime]/60), ":", RIGHT(CONCATENATE("0", MOD([Brower Leadtime], 60)), 2))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(FLOOR(bitable::$table[tblrVLIbf3JWwu6s].$field[fldfb6EXgu]/60), ":", RIGHT(CONCATENATE("0", MOD(bitable::$table[tblrVLIbf3JWwu6s].$field[fldfb6EXgu], 60)), 2))
```

</details>

### Proxy Time

- Field ID: `fldadMn7gB`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE(FLOOR([Proxy Leadtime]/60), ":", RIGHT(CONCATENATE("0", MOD([Proxy Leadtime], 60)), 2))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(FLOOR(bitable::$table[tblrVLIbf3JWwu6s].$field[fldeBVz6SN]/60), ":", RIGHT(CONCATENATE("0", MOD(bitable::$table[tblrVLIbf3JWwu6s].$field[fldeBVz6SN], 60)), 2))
```

</details>

### Check nghiệm thu

- Field ID: `fldljvfWtM`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Thu cũ nhanh]=1,1,
  AND([Thu cũ nhanh]=0,ISBLANK([Hình nghiệm thu máy cũ]).NOT(),ISBLANK([Scan QR máy cũ]).NOT()),1,
  TRUE(),0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblrVLIbf3JWwu6s].$field[fldZ8TuNeJ]=1,1,
  AND(bitable::$table[tblrVLIbf3JWwu6s].$field[fldZ8TuNeJ]=0,ISBLANK(bitable::$table[tblrVLIbf3JWwu6s].$field[fld3xMWtag]).NOT(),ISBLANK(bitable::$table[tblrVLIbf3JWwu6s].$field[fldDZyjhSO]).NOT()),1,
  TRUE(),0)
```

</details>

### Recheck thu cũ

- Field ID: `fldmcXVXeq`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Thu cũ check].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldQACJkWZ].LISTCOMBINE().UNIQUE()
```

</details>

### Status in thu cũ

- Field ID: `fldSaq1Euq`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in thu cũ].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldaJN98FR].LISTCOMBINE()
```

</details>

### Hình nghiệm thu máy cũ (1)

- Field ID: `fld745GV0Q`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[DS Máy thu cũ].FILTER(CurrentValue.[STT]=[STT]).[Hình nghiệm thu máy cũ].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblKcnh5FDIOXrnq].FILTER(CurrentValue.$column[fldgSx4RFF]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldWzcV5k1].LISTCOMBINE()
```

</details>

### TV_Time

- Field ID: `fldqYabPHg`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  [Trạng thái] = "Hoàn tất",
  IFERROR(ROUND(([Thời gian] - FIRST([Master].FILTER(AND(CurrentValue.[STT] = [STT], CurrentValue.[Trạng thái] = "Tiếp nhận")).[Thời gian])) * 1440, 1), ""),
  ""
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  bitable::$table[tblrVLIbf3JWwu6s].$field[fldIIitGRt] = "Hoàn tất",
  IFERROR(ROUND((bitable::$table[tblrVLIbf3JWwu6s].$field[fldZEk8hFO] - FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(AND(CurrentValue.$column[fldcLHVBDh] = bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh], CurrentValue.$column[fldIIitGRt] = "Tiếp nhận")).$column[fldZEk8hFO])) * 1440, 1), ""),
  ""
)
```

</details>

### Submit Lookup

- Field ID: `fldaD3GmlN`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[MSNV]=[Submit by]).[NV Tư vấn].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldHw877Vj]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldM5ab0R2]).$column[fldJRjsnyl].LISTCOMBINE().UNIQUE()
```

</details>

### Số điện thoại

- Field ID: `fldUi5kxvI`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Số điện thoại].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldXa0x23F].LISTCOMBINE()
```

</details>

### Lookup MSNV

- Field ID: `fldQU7ued2`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[NV Tư vấn]=[Người]).[MSNV].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldJRjsnyl]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0]).$column[fldHw877Vj].LISTCOMBINE().UNIQUE()
```

</details>

### Lookup Img MTC

- Field ID: `fld1mIORBQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[DS Máy thu cũ].FILTER(CurrentValue.[STT]=[STT]).[Hình nghiệm thu máy cũ].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblKcnh5FDIOXrnq].FILTER(CurrentValue.$column[fldgSx4RFF]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldWzcV5k1].LISTCOMBINE().UNIQUE()
```

</details>

### Check Tiếp nhận

- Field ID: `fldoiTs3gU`
- Loại: `Formula`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Hoàn tất]=0).[Tiếp nhận].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]&&CurrentValue.$column[fldCno47wg]=0).$column[fldH8Li40N].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Check_Phụ kiện

- Field ID: `fldtpWr2zd`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[NV Tư vấn]=[Người]&&CurrentValue.[Loại]="Tư vấn").[STT bàn].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldJRjsnyl]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0]&&CurrentValue.$column[fldRit1n6S]=bitable::$table[tbloNZbVZqXqIQ1N].$column[fldRit1n6S].$option[opt0XdapOK]).$column[fld5rSOixW].LISTCOMBINE().UNIQUE()
```

</details>

### Check Người

- Field ID: `fld5xlc1vE`
- Loại: `Formula`

Công thức theo tên:

```text
if([Người]="[VHWS] Mail Bot","",[Người])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0]="[VHWS] Mail Bot","",bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0])
```

</details>

### UDTT

- Field ID: `fld0lCSr44`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Note UDTT].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldWWWB3Hn].LISTCOMBINE().UNIQUE()
```

</details>

### Hyperlink Master

- Field ID: `fldLE9kym7`
- Loại: `Formula`

Công thức theo tên:

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlgyW6FoAQdwQnN8urwD6Gz3g?prefill_STT Input=",[STT Input],"&prefill_Người=",[Người],"&prefill_Trạng thái=","Hoàn tất"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlgyW6FoAQdwQnN8urwD6Gz3g?prefill_STT Input=",bitable::$table[tblrVLIbf3JWwu6s].$field[fldYDFo74e],"&prefill_Người=",bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0],"&prefill_Trạng thái=","Hoàn tất"))
```

</details>

### Status in backup

- Field ID: `fldsTnKWJR`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in backup].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldAnfmjTd].LISTCOMBINE()
```

</details>

### Check in flow

- Field ID: `fldmTh0yye`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Check in flow].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldzR9RSI6].LISTCOMBINE()
```

</details>

### End flow

- Field ID: `fldBrC5XH9`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[End flow].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fld3cTqxuu].LISTCOMBINE()
```

</details>

### Done in Flow

- Field ID: `fldS2I06Dd`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Done in Flow].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldyHDeUVB].LISTCOMBINE()
```

</details>

### SP 2

- Field ID: `fldnaqup1X`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 2].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldBYKdHTG].LISTCOMBINE()
```

</details>

### Số phiếu nhập

- Field ID: `fldHw3jMy4`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Số phiếu nhập].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldRFBKkn3].LISTCOMBINE().UNIQUE()
```

</details>

### Status in tư vấn

- Field ID: `fldmaX7oce`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in tư vấn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldD7jOiYZ].LISTCOMBINE()
```

</details>

### STT

- Field ID: `fldcLHVBDh`
- Loại: `Formula`

Công thức theo tên:

```text
iF([Selection STT]="",[STT Input],[Selection STT])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
iF(bitable::$table[tblrVLIbf3JWwu6s].$field[fldjLspGta]="",bitable::$table[tblrVLIbf3JWwu6s].$field[fldYDFo74e],bitable::$table[tblrVLIbf3JWwu6s].$field[fldjLspGta])
```

</details>

### Mã NV_FORM

- Field ID: `fldJXj5AUx`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[NV Tư vấn]=[Người]&&CurrentValue.[Loại]=[Loại_form]).[Selection-Tư vấn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldJRjsnyl]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldOfeySq0]&&CurrentValue.$column[fldRit1n6S]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldj9alXbl]).$column[fldr2l8Nfm].LISTCOMBINE()
```

</details>

### Lookup Mã NV

- Field ID: `fld36xJGCk`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[NV Tư vấn]=[Submit Lookup]&&CurrentValue.[Loại].CONTAIN([Loại 2])).[Selection-Tư vấn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldJRjsnyl]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldaD3GmlN]&&CurrentValue.$column[fldRit1n6S].CONTAIN(bitable::$table[tblrVLIbf3JWwu6s].$field[fldKPiQ5on])).$column[fldr2l8Nfm].LISTCOMBINE()
```

</details>

### TV_MãNV

- Field ID: `fldcL8QxIE`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[MSNV]=[Submit by]&&CurrentValue.[Loại]=[Loại 2]).[STT bàn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldHw877Vj]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldM5ab0R2]&&CurrentValue.$column[fldRit1n6S]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldKPiQ5on]).$column[fld5rSOixW].LISTCOMBINE()
```

</details>

### SP 3

- Field ID: `fldNo2kmZ5`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 3].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblrVLIbf3JWwu6s].$field[fldcLHVBDh]).$column[fldZzPhXWp].LISTCOMBINE()
```

</details>

### Họ và tên

- Field ID: `fldXor29jl`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
 LOOKUP(
   CONCATENATE([Số điện thoại],"_1"),
   [Danh sách đơn hàng].[SDT_STT],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 )="",
 LOOKUP(
   [Danh sách đơn hàng].[Mã đơn hàng],
   [Danh sách đơn hàng].[Mã đơn hàng],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 ),
 LOOKUP(
   CONCATENATE([Số điện thoại],"_1"),
   [Danh sách đơn hàng].[SDT_STT],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 )
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
 LOOKUP(
   CONCATENATE(bitable::$table[tblrVLIbf3JWwu6s].$field[fldUi5kxvI],"_1"),
   bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 )="",
 LOOKUP(
   bitable::$table[tbldXEATBg7vmOVR].$column[fldDfbfVGI],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldDfbfVGI],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 ),
 LOOKUP(
   CONCATENATE(bitable::$table[tblrVLIbf3JWwu6s].$field[fldUi5kxvI],"_1"),
   bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 )
)
```

</details>


<a id="table-tbl8ch0cficx9nqv"></a>

## Master_Check in

- Table ID: `tbl8Ch0cFICX9nQV`
- Công thức có nội dung: **34**

### ĐP_TC Tiếp theo

- Field ID: `fld63PJMgl`
- Loại: `Formula`

Công thức theo tên:

```text
if(and(([tblU2AfKU0y3gtUe].FILTER(CurrentValue.[fldqUkixLC]=[ĐP_TT THU CŨ]).[fldqUkixLC].LISTCOMBINE())="",[ĐK Thu cũ]="Thu cũ"),[STT],"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(and((bitable::$table[tblU2AfKU0y3gtUe].FILTER(CurrentValue.$column[fldqUkixLC]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldHs1s13B]).$column[fldqUkixLC].LISTCOMBINE())="",bitable::$table[tbl8Ch0cFICX9nQV].$field[fldUwKTDiM]="Thu cũ"),bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u],"")
```

</details>

### Họ và tên

- Field ID: `fldiTobCSQ`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  [Master_Danh sách đơn hàng].FILTER(
    CurrentValue.[SDT_STT]=CONCATENATE([SDT],"_1")
  ).[Họ và tên khách hàng].COUNTA()=0,

  FIRST(
    [Master_Danh sách đơn hàng].FILTER(
      CurrentValue.[Mã đơn hàng]=[Mã đơn hàng]
    ).[Họ và tên khách hàng]
      )
  ,
  FIRST(
    [Master_Danh sách đơn hàng].FILTER(
      CurrentValue.[SDT_STT]=CONCATENATE([SDT],"_1")
    ).[Họ và tên khách hàng]
       )

)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  bitable::$table[tblHoZh6Vyi1wjzY].FILTER(
    CurrentValue.$column[fld5kbBowl]=CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_1")
  ).$column[flda1n3HYO].COUNTA()=0,

  FIRST(
    bitable::$table[tblHoZh6Vyi1wjzY].FILTER(
      CurrentValue.$column[fldrZd4v9Y]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldZhTLKly]
    ).$column[flda1n3HYO]
      )
  ,
  FIRST(
    bitable::$table[tblHoZh6Vyi1wjzY].FILTER(
      CurrentValue.$column[fld5kbBowl]=CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_1")
    ).$column[flda1n3HYO]
       )

)
```

</details>

### STT Input

- Field ID: `fld5mP0Pt2`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  ISBLANK([STT_Selection]),
  VALUE(
    RIGHT(
      [Scan STT],
      LEN([Scan STT]) - FIND("prefill_STT+Input=", [Scan STT]) - 17
    )
  ),
  VALUE([STT_Selection])
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  ISBLANK(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldkfp6NoE]),
  VALUE(
    RIGHT(
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldisghkHn],
      LEN(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldisghkHn]) - FIND("prefill_STT+Input=", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldisghkHn]) - 17
    )
  ),
  VALUE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldkfp6NoE])
)
```

</details>

### Check nghiệm thu

- Field ID: `fldEHYOISD`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Master]
    .FILTER(
      CurrentValue.[STT] = [STT] &&
        CurrentValue.[Thu lại máy] = "Thu máy ngay"
    )
    .[Check nghiệm thu]
    .SUM() >
    0,
  CONCATENATE(
    "✅ Đã nghiệm thu (",
    [Master]
      .FILTER(
        CurrentValue.[STT] = [STT] &&
          CurrentValue.[Thu lại máy] = "Thu máy ngay"
      )
      .[Check nghiệm thu]
      .SUM(),
    ") / (",
    [Số lượng thu cũ],
    ")",
    " máy"
  ),
  [Thu cũ check] = "❌ KHÔNG THU CŨ ❌",
  "❌ Không thu cũ ",
  TRUE(),
  "❌ Chưa nghiệm thu máy"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblrVLIbf3JWwu6s]
    .FILTER(
      CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
        CurrentValue.$column[fldOtBd80L] = "Thu máy ngay"
    )
    .$column[fldljvfWtM]
    .SUM() >
    0,
  CONCATENATE(
    "✅ Đã nghiệm thu (",
    bitable::$table[tblrVLIbf3JWwu6s]
      .FILTER(
        CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
          CurrentValue.$column[fldOtBd80L] = "Thu máy ngay"
      )
      .$column[fldljvfWtM]
      .SUM(),
    ") / (",
    bitable::$table[tbl8Ch0cFICX9nQV].$field[fldCctbzDe],
    ")",
    " máy"
  ),
  bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "❌ KHÔNG THU CŨ ❌",
  "❌ Không thu cũ ",
  TRUE(),
  "❌ Chưa nghiệm thu máy"
)
```

</details>

### SP 2

- Field ID: `fldBYKdHTG`
- Loại: `Formula`

Công thức theo tên:

```text
LOOKUP(CONCATENATE([SDT],"_2"),[Danh sách đơn hàng].[SDT_STT],[Danh sách đơn hàng].[Tên sản phẩm])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
LOOKUP(CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_2"),bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],bitable::$table[tbldXEATBg7vmOVR].$column[fldPwhJExn])
```

</details>

### Status in backup

- Field ID: `fldAnfmjTd`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [BC_Check backup]="Cần check backup",
  "Cần check backup",

  [BC_Check backup]="Không Backup",
  "Không Backup",

  [Master].FILTER(
    CurrentValue.[STT]=[STT] &&
    CurrentValue.[Loại 2]="Backup"
  ).[STT].COUNTA()=0,
  "Chưa tiếp nhận",

  TRUE(),
  FIRST(
    [Master].FILTER(
      CurrentValue.[STT]=[STT] &&
      CurrentValue.[Loại 2]="Backup"
    )
    .SORTBY([Master].[Thời gian],FALSE)
    .[Trạng thái]
  )
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQXKXwMr]="Cần check backup",
  "Cần check backup",

  bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQXKXwMr]="Không Backup",
  "Không Backup",

  bitable::$table[tblrVLIbf3JWwu6s].FILTER(
    CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
    CurrentValue.$column[fldKPiQ5on]="Backup"
  ).$column[fldcLHVBDh].COUNTA()=0,
  "Chưa tiếp nhận",

  TRUE(),
  FIRST(
    bitable::$table[tblrVLIbf3JWwu6s].FILTER(
      CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
      CurrentValue.$column[fldKPiQ5on]="Backup"
    )
    .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO],FALSE)
    .$column[fldIIitGRt]
  )
)
```

</details>

### TV_Nsư Tư vấn

- Field ID: `fldymeXd5E`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Loại 2]="opt0XdapOK").[TV_MãNV].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldKPiQ5on]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldKPiQ5on].$option[opt0XdapOK]).$column[fldcL8QxIE].LISTCOMBINE().UNIQUE()
```

</details>

### STT

- Field ID: `fldvnrys2u`
- Loại: `Formula`

Công thức theo tên:

```text
if([STT Input]="",[STT_Selection],[STT Input])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(bitable::$table[tbl8Ch0cFICX9nQV].$field[fld5mP0Pt2]="",bitable::$table[tbl8Ch0cFICX9nQV].$field[fldkfp6NoE],bitable::$table[tbl8Ch0cFICX9nQV].$field[fld5mP0Pt2])
```

</details>

### TC_Nsư thu cũ

- Field ID: `fldvMmgPCs`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Loại 2]="optnVfhjkO").[TV_MãNV].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldKPiQ5on]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldKPiQ5on].$option[optnVfhjkO]).$column[fldcL8QxIE].LISTCOMBINE().UNIQUE()
```

</details>

### Backup check

- Field ID: `fldnNBkpYs`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Master].FILTER(CurrentValue.[STT]=[STT]).[Back up].COUNTA()=0,
  "Chưa check Backup",
  last([Master].FILTER(CurrentValue.[STT]=[STT]).[Back up])="Có",
  "Có backup",
  TRUE(),
  "Không Backup"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]).$column[fldwsvQ36E].COUNTA()=0,
  "Chưa check Backup",
  last(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]).$column[fldwsvQ36E])="Có",
  "Có backup",
  TRUE(),
  "Không Backup"
)
```

</details>

### BC_Nhân sự

- Field ID: `fldtqoRUx2`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Loại 2]="optJl7oANg").[TV_MãNV].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldKPiQ5on]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldKPiQ5on].$option[optJl7oANg]).$column[fldcL8QxIE].LISTCOMBINE().UNIQUE()
```

</details>

### Số điện thoại_ĐH

- Field ID: `fldUtOGKfj`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Danh sách đơn hàng].FILTER(CurrentValue.[Mã đơn hàng]=[Mã đơn hàng]).[SDT].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbldXEATBg7vmOVR].FILTER(CurrentValue.$column[fldDfbfVGI]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldZhTLKly]).$column[fldzAHyox9].LISTCOMBINE().UNIQUE()
```

</details>

### End flow

- Field ID: `fld3cTqxuu`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  AND(
    [Status in tư vấn]="Hoàn tất",

    OR(
      [Thu cũ check]="❌ KHÔNG THU CŨ ❌",
      [Status in thu cũ]="Hoàn tất"
    ),

    OR(
      [Status in backup]="Không Backup",
      [Status in backup]="Hoàn tất"
    )
  ),
  "End flow",
  "In flow"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  AND(
    bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ]="Hoàn tất",

    OR(
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ]="❌ KHÔNG THU CŨ ❌",
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR]="Hoàn tất"
    ),

    OR(
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd]="Không Backup",
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd]="Hoàn tất"
    )
  ),
  "End flow",
  "In flow"
)
```

</details>

### BC_Check backup

- Field ID: `fldQXKXwMr`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Master].FILTER(
    CurrentValue.[STT]=[STT] &&
    (
      CurrentValue.[Loại 2]="Tư vấn" ||
      CurrentValue.[Loại 2]="Thu cũ"
    )
  ).[STT].COUNTA()=0,
  "Cần check backup",

  FIRST(
    [Master].FILTER(
      CurrentValue.[STT]=[STT] &&
      (
        CurrentValue.[Loại 2]="Tư vấn" ||
        CurrentValue.[Loại 2]="Thu cũ"
      )
    )
    .SORTBY([Master].[Thời gian],FALSE)
    .[Back up]
  )="Có",
  "Có Backup",

  FIRST(
    [Master].FILTER(
      CurrentValue.[STT]=[STT] &&
      (
        CurrentValue.[Loại 2]="Tư vấn" ||
        CurrentValue.[Loại 2]="Thu cũ"
      )
    )
    .SORTBY([Master].[Thời gian],FALSE)
    .[Back up]
  )="Không",
  "Không Backup",

  TRUE(),
  "Cần check backup"
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(
    CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
    (
      CurrentValue.$column[fldKPiQ5on]="Tư vấn" ||
      CurrentValue.$column[fldKPiQ5on]="Thu cũ"
    )
  ).$column[fldcLHVBDh].COUNTA()=0,
  "Cần check backup",

  FIRST(
    bitable::$table[tblrVLIbf3JWwu6s].FILTER(
      CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
      (
        CurrentValue.$column[fldKPiQ5on]="Tư vấn" ||
        CurrentValue.$column[fldKPiQ5on]="Thu cũ"
      )
    )
    .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO],FALSE)
    .$column[fldwsvQ36E]
  )="Có",
  "Có Backup",

  FIRST(
    bitable::$table[tblrVLIbf3JWwu6s].FILTER(
      CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
      (
        CurrentValue.$column[fldKPiQ5on]="Tư vấn" ||
        CurrentValue.$column[fldKPiQ5on]="Thu cũ"
      )
    )
    .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO],FALSE)
    .$column[fldwsvQ36E]
  )="Không",
  "Không Backup",

  TRUE(),
  "Cần check backup"
)
```

</details>

### Check in flow

- Field ID: `fldzR9RSI6`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  NOT(
    AND(
      [Status in tư vấn] = "Hoàn tất",
      OR([Thu cũ check] = "❌ KHÔNG THU CŨ ❌", [Status in thu cũ] = "Hoàn tất"),
      OR([Status in backup] = "Không backup", [Status in backup] = "Hoàn tất")
    )
  ),
  "In flow",
  IFS(
    AND([Thu cũ check] = "✅ CÓ THU CŨ ✅", [Status in backup] = "Hoàn tất"),
    "Hoàn tất thu cũ, tư vấn và backup",
    AND([Thu cũ check] = "✅ CÓ THU CŨ ✅", [Status in backup] = "Không backup"),
    "Hoàn tất thu cũ và tư vấn",
    AND([Thu cũ check] = "❌ KHÔNG THU CŨ ❌", [Status in backup] = "Hoàn tất"),
    "Hoàn tất tư vấn và backup",
    TRUE(),
    "Hoàn tất tư vấn"
  )
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  NOT(
    AND(
      bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ] = "Hoàn tất",
      OR(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "❌ KHÔNG THU CŨ ❌", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR] = "Hoàn tất"),
      OR(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Không backup", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Hoàn tất")
    )
  ),
  "In flow",
  IFS(
    AND(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "✅ CÓ THU CŨ ✅", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Hoàn tất"),
    "Hoàn tất thu cũ, tư vấn và backup",
    AND(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "✅ CÓ THU CŨ ✅", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Không backup"),
    "Hoàn tất thu cũ và tư vấn",
    AND(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "❌ KHÔNG THU CŨ ❌", bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Hoàn tất"),
    "Hoàn tất tư vấn và backup",
    TRUE(),
    "Hoàn tất tư vấn"
  )
)
```

</details>

### SP 3

- Field ID: `fldZzPhXWp`
- Loại: `Formula`

Công thức theo tên:

```text
LOOKUP(CONCATENATE([SDT],"_3"),[Danh sách đơn hàng].[SDT_STT],[Danh sách đơn hàng].[Tên sản phẩm])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
LOOKUP(CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_3"),bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],bitable::$table[tbldXEATBg7vmOVR].$column[fldPwhJExn])
```

</details>

### Đẩy SMS

- Field ID: `fldeH8bceO`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[STT]).[Đẩy SMS].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]).$column[fld0Ttpi6Y].LISTCOMBINE().UNIQUE()
```

</details>

### Status in thu cũ

- Field ID: `fldaJN98FR`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Thu cũ check] = "❌ KHÔNG THU CŨ ❌",
  "Không thu cũ",

  [Master].FILTER(
    CurrentValue.[STT] = [STT] &&
    CurrentValue.[Loại 2] = "Thu cũ"
  ).[STT].COUNTA() = 0,
  "Chưa tiếp nhận",

  TRUE(),
  IF(
    FIRST(
      [Master].FILTER(
        CurrentValue.[STT] = [STT] &&
        CurrentValue.[Loại 2] = "Thu cũ"
      )
      .SORTBY([Master].[Thời gian], FALSE)
      .[Trạng thái]
    ) = "Thu máy nhanh",
    "Hoàn tất",

    FIRST(
      [Master].FILTER(
        CurrentValue.[STT] = [STT] &&
        CurrentValue.[Loại 2] = "Thu cũ"
      )
      .SORTBY([Master].[Thời gian], FALSE)
      .[Trạng thái]
    )
  )
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tbl8Ch0cFICX9nQV].$field[fldQACJkWZ] = "❌ KHÔNG THU CŨ ❌",
  "Không thu cũ",

  bitable::$table[tblrVLIbf3JWwu6s].FILTER(
    CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
    CurrentValue.$column[fldKPiQ5on] = "Thu cũ"
  ).$column[fldcLHVBDh].COUNTA() = 0,
  "Chưa tiếp nhận",

  TRUE(),
  IF(
    FIRST(
      bitable::$table[tblrVLIbf3JWwu6s].FILTER(
        CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
        CurrentValue.$column[fldKPiQ5on] = "Thu cũ"
      )
      .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
      .$column[fldIIitGRt]
    ) = "Thu máy nhanh",
    "Hoàn tất",

    FIRST(
      bitable::$table[tblrVLIbf3JWwu6s].FILTER(
        CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] &&
        CurrentValue.$column[fldKPiQ5on] = "Thu cũ"
      )
      .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
      .$column[fldIIitGRt]
    )
  )
)
```

</details>

### SDT

- Field ID: `fldDSuXdZn`
- Loại: `Formula`

Công thức theo tên:

```text
if([Số điện thoại]!="",[Số điện thoại],LOOKUP([Mã đơn hàng],[Master_Danh sách đơn hàng].[Mã đơn hàng],[Master_Danh sách đơn hàng].[SDT]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldXa0x23F]!="",bitable::$table[tbl8Ch0cFICX9nQV].$field[fldXa0x23F],LOOKUP(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldZhTLKly],bitable::$table[tblHoZh6Vyi1wjzY].$column[fldrZd4v9Y],bitable::$table[tblHoZh6Vyi1wjzY].$column[fldTUj1aeT]))
```

</details>

### Thời gian End-flow

- Field ID: `fldmStU4Tk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  [End flow] = "End flow",
  IFERROR(
    TEXT(
      MAX(
        [Master].FILTER(
          (CurrentValue.[STT Input] = [STT]) &&
          (CurrentValue.[Trạng thái] = "Hoàn tất")
        ).[Thời gian]
      ),
      "HH:mm"
    ),
    ""
  ),
  ""
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  bitable::$table[tbl8Ch0cFICX9nQV].$field[fld3cTqxuu] = "End flow",
  IFERROR(
    TEXT(
      MAX(
        bitable::$table[tblrVLIbf3JWwu6s].FILTER(
          (CurrentValue.$column[fldYDFo74e] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]) &&
          (CurrentValue.$column[fldIIitGRt] = "Hoàn tất")
        ).$column[fldZEk8hFO]
      ),
      "HH:mm"
    ),
    ""
  ),
  ""
)
```

</details>

### TV_Phụ kiện

- Field ID: `fld6mOtYt9`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Mua thêm phụ kiện]="Có").[Note phụ kiện].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldONGQ1ib]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldONGQ1ib].$option[opt6lYz5f3]).$column[fldAG6XiWR].LISTCOMBINE().UNIQUE()
```

</details>

### Status in tư vấn

- Field ID: `fldD7jOiYZ`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Master].FILTER(CurrentValue.[STT]=[STT] && CurrentValue.[Loại 2]="Tư vấn").[STT].COUNTA()=0,
  "Chưa tiếp nhận",
  TRUE(),
  FIRST(
    [Master].FILTER(CurrentValue.[STT]=[STT] && (CurrentValue.[Loại 2]="Tư vấn" || CurrentValue.[Loại 2]="Tư vấn"))
      .SORTBY([Master].[Thời gian], FALSE)
      .[Trạng thái]
  )
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] && CurrentValue.$column[fldKPiQ5on]="Tư vấn").$column[fldcLHVBDh].COUNTA()=0,
  "Chưa tiếp nhận",
  TRUE(),
  FIRST(
    bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] && (CurrentValue.$column[fldKPiQ5on]="Tư vấn" || CurrentValue.$column[fldKPiQ5on]="Tư vấn"))
      .SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE)
      .$column[fldIIitGRt]
  )
)
```

</details>

### Done in Flow

- Field ID: `fldyHDeUVB`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  OR(
      AND(
        OR( [Status in thu cũ] = "Không thu cũ",
        [Status in thu cũ] = "Chưa tiếp nhận" ),
        [Status in tư vấn] = "Chưa tiếp nhận",

        OR( [Status in backup] = "Check Backup",
        [Status in backup] = "Chưa tiếp nhận" )
          ),

      OR(
        AND( [Status in thu cũ] = "Tiếp nhận",
        [Status in tư vấn] != "Hoàn tất",
        [Status in backup] != "Hoàn tất"),

        AND([Status in tư vấn]= "Tiếp nhận",
        [Status in thu cũ]!= "Hoàn tất",
        [Status in backup] != "Hoàn tất"),

         AND([Status in backup]= "Tiếp nhận",
         [Status in tư vấn]!= "Hoàn tất",
         [Status in backup] != "Hoàn tất")
    )),
  "Check in",
  TRUE(),
  FIRST(
    [Master] .FILTER( CurrentValue.[STT] = [STT] && CurrentValue.[Trạng thái] = "Hoàn tất" && ( CurrentValue.[Loại 2] = "Tư vấn" || CurrentValue.[Loại 2] = "Thu cũ" || CurrentValue.[Loại 2] = "Backup" ) ).SORTBY([Master].[Thời gian], FALSE) .[Loại 2]
        )
    )
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  OR(
      AND(
        OR( bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR] = "Không thu cũ",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR] = "Chưa tiếp nhận" ),
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ] = "Chưa tiếp nhận",

        OR( bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Check Backup",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] = "Chưa tiếp nhận" )
          ),

      OR(
        AND( bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR] = "Tiếp nhận",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ] != "Hoàn tất",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] != "Hoàn tất"),

        AND(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ]= "Tiếp nhận",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldaJN98FR]!= "Hoàn tất",
        bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] != "Hoàn tất"),

         AND(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd]= "Tiếp nhận",
         bitable::$table[tbl8Ch0cFICX9nQV].$field[fldD7jOiYZ]!= "Hoàn tất",
         bitable::$table[tbl8Ch0cFICX9nQV].$field[fldAnfmjTd] != "Hoàn tất")
    )),
  "Check in",
  TRUE(),
  FIRST(
    bitable::$table[tblrVLIbf3JWwu6s] .FILTER( CurrentValue.$column[fldcLHVBDh] = bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u] && CurrentValue.$column[fldIIitGRt] = "Hoàn tất" && ( CurrentValue.$column[fldKPiQ5on] = "Tư vấn" || CurrentValue.$column[fldKPiQ5on] = "Thu cũ" || CurrentValue.$column[fldKPiQ5on] = "Backup" ) ).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO], FALSE) .$column[fldKPiQ5on]
        )
    )
```

</details>

### ĐP_TT THU CŨ

- Field ID: `fldHs1s13B`
- Loại: `Formula`

Công thức theo tên:

```text
IF([ĐK Thu cũ]!="",[Master_Check in].COUNTIF(CurrentValue.[ĐK Thu cũ]=[ĐK Thu cũ]&&CurrentValue.[Phụ_STT]<=[Phụ_STT]),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldUwKTDiM]!="",bitable::$table[tbl8Ch0cFICX9nQV].COUNTIF(CurrentValue.$column[fldUwKTDiM]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldUwKTDiM]&&CurrentValue.$column[fldlIy9usK]<=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldlIy9usK]),"")
```

</details>

### SP 1

- Field ID: `fldkRED68l`
- Loại: `Formula`

Công thức theo tên:

```text
LOOKUP(CONCATENATE([SDT],"_1"),[Danh sách đơn hàng].[SDT_STT],[Danh sách đơn hàng].[Tên sản phẩm])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
LOOKUP(CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_1"),bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],bitable::$table[tbldXEATBg7vmOVR].$column[fldPwhJExn])
```

</details>

### SP 4

- Field ID: `fldecG1ua9`
- Loại: `Formula`

Công thức theo tên:

```text
LOOKUP(CONCATENATE([SDT],"_4"),[Danh sách đơn hàng].[SDT_STT],[Danh sách đơn hàng].[Tên sản phẩm])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
LOOKUP(CONCATENATE(bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn],"_4"),bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],bitable::$table[tbldXEATBg7vmOVR].$column[fldPwhJExn])
```

</details>

### Thu cũ sau

- Field ID: `fld85dAlqj`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Phân loại]="Thu cũ sau").[Phân loại].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldXsfGtzR]=bitable::$table[tbll7MRKLPSgG0vV].$column[fldXsfGtzR].$option[opt5lgX6IG]).$column[fldXsfGtzR].LISTCOMBINE()
```

</details>

### Phụ kiện

- Field ID: `flddLDRUPX`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]&&CurrentValue.[Mua thêm phụ kiện]="Có").[Note phụ kiện].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]&&CurrentValue.$column[fldONGQ1ib]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldONGQ1ib].$option[opt6lYz5f3]).$column[fldAG6XiWR].LISTCOMBINE().UNIQUE()
```

</details>

### ĐK Thu cũ

- Field ID: `fldUwKTDiM`
- Loại: `Formula`

Công thức theo tên:

```text
if(([Danh sách đơn hàng].FILTER(CurrentValue.[SDT]=[SDT]).[ĐK thu cũ].LISTCOMBINE().SUM())=0,"❌ KHÔNG THU CŨ ❌","✅ CÓ THU CŨ ✅")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if((bitable::$table[tbldXEATBg7vmOVR].FILTER(CurrentValue.$column[fldzAHyox9]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldDSuXdZn]).$column[fldUkVpSYe].LISTCOMBINE().SUM())=0,"❌ KHÔNG THU CŨ ❌","✅ CÓ THU CŨ ✅")
```

</details>

### Note UDTT

- Field ID: `fldWWWB3Hn`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Danh sách đơn hàng].FILTER(CurrentValue.[SDT]=[Số điện thoại]).[Sử dụng UDTT].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbldXEATBg7vmOVR].FILTER(CurrentValue.$column[fldzAHyox9]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldXa0x23F]).$column[fldnIk77ju].LISTCOMBINE().UNIQUE()
```

</details>

### Lark_Master

- Field ID: `fldjWKbS2I`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[STT]=[STT]).[Người].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcLHVBDh]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]).$column[fldOfeySq0].LISTCOMBINE()
```

</details>

### Check STT

- Field ID: `fldEQPZumu`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
[STT + Status].FILTER(CurrentValue.[Selection_STT]=[STT]).[SDT].LISTCOMBINE()="","✅ SỐ KHẢ DỤNG","❌ ĐÃ CHECK IN ❌")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
bitable::$table[tblTS5i2slUtV2Fm].FILTER(CurrentValue.$column[fldKypZwzl]=bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]).$column[fldoFA95lO].LISTCOMBINE()="","✅ SỐ KHẢ DỤNG","❌ ĐÃ CHECK IN ❌")
```

</details>

### Hyperlink

- Field ID: `flds7RDO5L`
- Loại: `Formula`

Công thức theo tên:

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlg3mc0d7KacCL6mFsReGVnUf?prefill_STT input=",[STT]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlg3mc0d7KacCL6mFsReGVnUf?prefill_STT input=",bitable::$table[tbl8Ch0cFICX9nQV].$field[fldvnrys2u]))
```

</details>

### Thu cũ check

- Field ID: `fldQACJkWZ`
- Loại: `Formula`

Công thức theo tên:

```text
if([Thu cũ sau]="Thu cũ sau","♻️ THU CŨ SAU ♻️",IF(
[Số lượng thu cũ]=0,"❌ KHÔNG THU CŨ ❌","✅ CÓ THU CŨ ✅"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(bitable::$table[tbl8Ch0cFICX9nQV].$field[fld85dAlqj]="Thu cũ sau","♻️ THU CŨ SAU ♻️",IF(
bitable::$table[tbl8Ch0cFICX9nQV].$field[fldCctbzDe]=0,"❌ KHÔNG THU CŨ ❌","✅ CÓ THU CŨ ✅"))
```

</details>

### Trường Formula/Lookup đang trống

- `Check bàn giao máy` — `fldQVhALNj` — Formula


<a id="table-tblhozh6vyi1wjzy"></a>

## Master_Danh sách đơn hàng

- Table ID: `tblHoZh6Vyi1wjzY`
- Công thức có nội dung: **3**

### Phụ_TT XH

- Field ID: `fldV37lWCs`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Danh sách đơn hàng].COUNTIF(CurrentValue.[SDT]=[SDT]&&CurrentValue.[Phụ_STT]<=[Phụ_STT])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblHoZh6Vyi1wjzY].COUNTIF(CurrentValue.$column[fldTUj1aeT]=bitable::$table[tblHoZh6Vyi1wjzY].$field[fldTUj1aeT]&&CurrentValue.$column[fldigfiLyy]<=bitable::$table[tblHoZh6Vyi1wjzY].$field[fldigfiLyy])
```

</details>

### SDT_STT

- Field ID: `fld5kbBowl`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE([SDT],"_",[Phụ_TT XH])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(bitable::$table[tblHoZh6Vyi1wjzY].$field[fldTUj1aeT],"_",bitable::$table[tblHoZh6Vyi1wjzY].$field[fldV37lWCs])
```

</details>

### CI_STT

- Field ID: `fldHug6kWa`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[STT + Status].FILTER(CurrentValue.[SDT]=[SDT]).[Selection_STT].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblTS5i2slUtV2Fm].FILTER(CurrentValue.$column[fldoFA95lO]=bitable::$table[tblHoZh6Vyi1wjzY].$field[fldTUj1aeT]).$column[fldKypZwzl].LISTCOMBINE()
```

</details>


<a id="table-tblonzbvzqxqiq1n"></a>

## Master_DS

- Table ID: `tbloNZbVZqXqIQ1N`
- Công thức có nội dung: **18**

### MSNV

- Field ID: `fldHw877Vj`
- Loại: `Formula`

Công thức theo tên:

```text
[NV Tư vấn.ID nhân viên]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].$field[fldJ11crSq]
```

</details>

### Leadtime trung bình

- Field ID: `fldstWfhnj`
- Loại: `Formula`

Công thức theo tên:

```text
IF(ISNULL([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE()),"",ROUNDDOWN([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),0)&" Phút "&ROUND(MOD([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).[Brower Leadtime].AVERAGE(),1)*60,0)&" Giây")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(ISNULL(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE()),"",ROUNDDOWN(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),0)&" Phút "&ROUND(MOD(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]).$column[fldfb6EXgu].AVERAGE(),1)*60,0)&" Giây")
```

</details>

### Sl TV hoàn tất

- Field ID: `fldYbqBChA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Hoàn tất"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optxUoQwNe]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### STT gần nhất (helper)

- Field ID: `fldVikLa0p`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).SORTBY([Master].[Thời gian],FALSE).[STT])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldZEk8hFO],FALSE).$column[fldcLHVBDh])
```

</details>

### NPI_AIO_User

- Field ID: `fldoVOBCT3`
- Loại: `Formula`

Công thức theo tên:

```text
[MSNV]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].$field[fldHw877Vj]
```

</details>

### Sl khách chờ

- Field ID: `fldXbnPUJi`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl đã điều phối]=[Sl TV đã tiếp nhận],0,MAX(0,[Sl đã điều phối]-[Sl TV đã tiếp nhận]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldK1eNXXi]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldyGgztEQ],0,MAX(0,bitable::$table[tbloNZbVZqXqIQ1N].$field[fldK1eNXXi]-bitable::$table[tbloNZbVZqXqIQ1N].$field[fldyGgztEQ]))
```

</details>

### Sl TV đã tiếp nhận

- Field ID: `fldyGgztEQ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master].FILTER(CurrentValue.[Trạng thái]="Tiếp nhận"&&CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).[STT].LISTCOMBINE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldIIitGRt]=bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt].$option[optiFjhcAs]&&CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]).$column[fldcLHVBDh].LISTCOMBINE().COUNTA()
```

</details>

### TT_min

- Field ID: `fldaaybIyk`
- Loại: `Formula`

Công thức theo tên:

```text
IF(COUNTA([Master_Điều phối].FILTER(OR(CurrentValue.[DS Tư vấn]=[Selection-Tư vấn]&&CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",CurrentValue.[DS Thu cũ]=[Selection-Tư vấn]&&OR(CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",CurrentValue.[Status in thu cũ]="Không thu cũ"),CurrentValue.[DS Backup]=[Selection-Tư vấn]&&OR(CurrentValue.[Status in backup]="Chưa tiếp nhận",CurrentValue.[Status in backup]="Không backup",CurrentValue.[Status in backup]="Check backup"))).[Thứ tự bản ghi])>0,MIN([Master_Điều phối].FILTER(OR(CurrentValue.[DS Tư vấn]=[Selection-Tư vấn]&&CurrentValue.[Status in tư vấn]="Chưa tiếp nhận",CurrentValue.[DS Thu cũ]=[Selection-Tư vấn]&&OR(CurrentValue.[Status in thu cũ]="Chưa tiếp nhận",CurrentValue.[Status in thu cũ]="Không thu cũ"),CurrentValue.[DS Backup]=[Selection-Tư vấn]&&OR(CurrentValue.[Status in backup]="Chưa tiếp nhận",CurrentValue.[Status in backup]="Không backup",CurrentValue.[Status in backup]="Check backup"))).[Thứ tự bản ghi]),"Unk")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(COUNTA(bitable::$table[tbll7MRKLPSgG0vV].FILTER(OR(CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&OR(CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",CurrentValue.$column[fldDj1873T]="Không thu cũ"),CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&OR(CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",CurrentValue.$column[fld4rEDKuK]="Không backup",CurrentValue.$column[fld4rEDKuK]="Check backup"))).$column[flduWr1tYp])>0,MIN(bitable::$table[tbll7MRKLPSgG0vV].FILTER(OR(CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&CurrentValue.$column[fldkyTVtcU]="Chưa tiếp nhận",CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&OR(CurrentValue.$column[fldDj1873T]="Chưa tiếp nhận",CurrentValue.$column[fldDj1873T]="Không thu cũ"),CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]&&OR(CurrentValue.$column[fld4rEDKuK]="Chưa tiếp nhận",CurrentValue.$column[fld4rEDKuK]="Không backup",CurrentValue.$column[fld4rEDKuK]="Check backup"))).$column[flduWr1tYp]),"Unk")
```

</details>

### NPI_AIO_Pass

- Field ID: `fldQ9bV60M`
- Loại: `Formula`

Công thức theo tên:

```text
RIGHT([NPI_AIO_User],5)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
RIGHT(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldoVOBCT3],5)
```

</details>

### Sl đã điều phối

- Field ID: `fldK1eNXXi`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[DS Thu cũ]=[STT bàn]||CurrentValue.[DS Tư vấn]=[STT bàn]||CurrentValue.[DS Backup]=[STT bàn]).[STT].LISTCOMBINE().UNIQUE().COUNTA()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld0Z1nlar]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]||CurrentValue.$column[fldhvgL0d9]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]||CurrentValue.$column[fldLWBBwTv]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]).$column[fld7MVTZRT].LISTCOMBINE().UNIQUE().COUNTA()
```

</details>

### Trạng thái gần nhất (helper)

- Field ID: `fldzEmIei5`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).SORTBY([Master].[Trạng thái],TRUE).[Trạng thái])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldIIitGRt],TRUE).$column[fldIIitGRt])
```

</details>

### Khách gần nhất (helper)

- Field ID: `fldHd9nqbt`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[Selection-Tư vấn]).SORTBY([Master].[STT],FALSE).[Họ và tên])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldcLHVBDh],FALSE).$column[fldXor29jl])
```

</details>

### Dự kiến kết thúc

- Field ID: `fldfm5RdMH`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",[TG gần nhất]+DURATION(0,0,ROUND([Leadtime trung bình],0),0),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldLceRTKF]="Đang tư vấn",bitable::$table[tbloNZbVZqXqIQ1N].$field[fldbh4uyRu]+DURATION(0,0,ROUND(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldstWfhnj],0),0),"")
```

</details>

### STT tiếp theo

- Field ID: `fldxG0Lbhr`
- Loại: `Formula`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[Thứ tự bản ghi]=[TT_min]).[STT input]
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[flduWr1tYp]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldaaybIyk]).$column[fldiJpcGUT]
```

</details>

### TG gần nhất

- Field ID: `fldbh4uyRu`
- Loại: `Formula`

Công thức theo tên:

```text
FIRST([Master].FILTER(CurrentValue.[TV_MãNV]=[STT bàn]).SORTBY([Master].[Mã TC],FALSE).[Thời gian])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
FIRST(bitable::$table[tblrVLIbf3JWwu6s].FILTER(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fld5rSOixW]).SORTBY(bitable::$table[tblrVLIbf3JWwu6s].$column[fldXDIHbwi],FALSE).$column[fldZEk8hFO])
```

</details>

### DS_TV_Dash

- Field ID: `fld2TfmBFa`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Trạng thái hiện tại (kết quả chính)]="Đang tư vấn",1,0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldLceRTKF]="Đang tư vấn",1,0)
```

</details>

### Sl TV đang tiếp nhận

- Field ID: `fldavHNrMM`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Sl TV đã tiếp nhận]>[Sl TV hoàn tất],[Sl TV đã tiếp nhận]-[Sl TV hoàn tất],0)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldyGgztEQ]>bitable::$table[tbloNZbVZqXqIQ1N].$field[fldYbqBChA],bitable::$table[tbloNZbVZqXqIQ1N].$field[fldyGgztEQ]-bitable::$table[tbloNZbVZqXqIQ1N].$field[fldYbqBChA],0)
```

</details>

### Trạng thái hiện tại (kết quả chính)

- Field ID: `fldLceRTKF`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master].COUNTIF(CurrentValue.[TV_MãNV]=[Selection-Tư vấn])=0,"Chưa có dữ liệu",IF([Trạng thái gần nhất (helper)]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tblrVLIbf3JWwu6s].COUNTIF(CurrentValue.$column[fldcL8QxIE]=bitable::$table[tbloNZbVZqXqIQ1N].$field[fldr2l8Nfm])=0,"Chưa có dữ liệu",IF(bitable::$table[tbloNZbVZqXqIQ1N].$field[fldzEmIei5]="Tiếp nhận","Đang tư vấn","Rảnh"))
```

</details>

### Trường Formula/Lookup đang trống

- `Hyperlink hoàn tất` — `fldTaQpzKa` — Formula
- `Hyperlink tiếp nhận` — `fldamAMKs6` — Formula


<a id="table-tbll7mrklpsgg0vv"></a>

## Master_Điều phối

- Table ID: `tbll7MRKLPSgG0vV`
- Công thức có nội dung: **18**

### Status in backup

- Field ID: `fld4rEDKuK`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in backup].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldAnfmjTd].LISTCOMBINE()
```

</details>

### Họ và tên

- Field ID: `fldSMCmAXe`
- Loại: `Formula`

Công thức theo tên:

```text
if([Check Check-in]="✅ ĐÃ CHECK-IN",IF(
 LOOKUP(
   CONCATENATE([SDT],"_1"),
   [Danh sách đơn hàng].[SDT_STT],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 )="",
 LOOKUP(
   [Danh sách đơn hàng].[Mã đơn hàng],
   [Danh sách đơn hàng].[Mã đơn hàng],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 ),
 LOOKUP(
   CONCATENATE([SDT],"_1"),
   [Danh sách đơn hàng].[SDT_STT],
   [Danh sách đơn hàng].[Họ và tên khách hàng]
 )
),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if(bitable::$table[tbll7MRKLPSgG0vV].$field[fldanWonAB]="✅ ĐÃ CHECK-IN",IF(
 LOOKUP(
   CONCATENATE(bitable::$table[tbll7MRKLPSgG0vV].$field[fldq4b86BA],"_1"),
   bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 )="",
 LOOKUP(
   bitable::$table[tbldXEATBg7vmOVR].$column[fldDfbfVGI],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldDfbfVGI],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 ),
 LOOKUP(
   CONCATENATE(bitable::$table[tbll7MRKLPSgG0vV].$field[fldq4b86BA],"_1"),
   bitable::$table[tbldXEATBg7vmOVR].$column[fldxxs69Cn],
   bitable::$table[tbldXEATBg7vmOVR].$column[fldt9S56np]
 )
),"")
```

</details>

### SP 3

- Field ID: `fld9m9I9dG`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 3].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldZzPhXWp].LISTCOMBINE()
```

</details>

### SDT

- Field ID: `fldq4b86BA`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Số điện thoại].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldXa0x23F].LISTCOMBINE()
```

</details>

### Hyperlink Điều phối

- Field ID: `fldMBA9zaV`
- Loại: `Formula`

Công thức theo tên:

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlg3mc0d7KacCL6mFsReGVnUf?prefill_STT input=",[STT]))
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
HYPERLINK(CONCATENATE("https://dieuphuc.sg.larksuite.com/share/base/form/shrlg3mc0d7KacCL6mFsReGVnUf?prefill_STT input=",bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]))
```

</details>

### STT

- Field ID: `fld7MVTZRT`
- Loại: `Formula`

Công thức theo tên:

```text
iF([STT - Check in]="",[STT input],[STT - Check in])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
iF(bitable::$table[tbll7MRKLPSgG0vV].$field[fldRDEoMev]="",bitable::$table[tbll7MRKLPSgG0vV].$field[fldiJpcGUT],bitable::$table[tbll7MRKLPSgG0vV].$field[fldRDEoMev])
```

</details>

### Status in thu cũ

- Field ID: `fldDj1873T`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in thu cũ].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldaJN98FR].LISTCOMBINE()
```

</details>

### Check nghiệm thu máy cũ

- Field ID: `fldQ8ycZXv`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Check nghiệm thu].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldEHYOISD].LISTCOMBINE()
```

</details>

### SP 4

- Field ID: `fldD1pt950`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 4].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldecG1ua9].LISTCOMBINE()
```

</details>

### Check Check-in

- Field ID: `fldanWonAB`
- Loại: `Formula`

Công thức theo tên:

```text
IF([Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[STT].LISTCOMBINE()!="","✅ ĐÃ CHECK-IN","❌ CHƯA CHECK IN ❌")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldvnrys2u].LISTCOMBINE()!="","✅ ĐÃ CHECK-IN","❌ CHƯA CHECK IN ❌")
```

</details>

### SP 2

- Field ID: `fldrQzmoQH`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 2].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldBYKdHTG].LISTCOMBINE()
```

</details>

### Status in tư vấn

- Field ID: `fldkyTVtcU`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Status in tư vấn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldD7jOiYZ].LISTCOMBINE()
```

</details>

### Submit Lookup

- Field ID: `fldTltkNBO`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_DS].FILTER(CurrentValue.[MSNV]=[Submit by]||CurrentValue.[STT bàn]="admin").[NV Tư vấn].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbloNZbVZqXqIQ1N].FILTER(CurrentValue.$column[fldHw877Vj]=bitable::$table[tbll7MRKLPSgG0vV].$field[fldtc4WIhH]||CurrentValue.$column[fld5rSOixW]="admin").$column[fldJRjsnyl].LISTCOMBINE().UNIQUE()
```

</details>

### Mã ĐP

- Field ID: `fldQZ3q7RF`
- Loại: `Formula`

Công thức theo tên:

```text
if( [STT]!="",CONCATENATE("DP.",[STT]),"")
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
if( bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]!="",CONCATENATE("DP.",bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]),"")
```

</details>

### Thu cũ

- Field ID: `fldFQH42ac`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Số lượng thu cũ].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldCctbzDe].LISTCOMBINE()
```

</details>

### ĐP_TT TC tiếp theo

- Field ID: `fldM7d64qE`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[ĐP_TC Tiếp theo]!="").[ĐP_TC Tiếp theo].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fld63PJMgl]!="").$column[fld63PJMgl].LISTCOMBINE()
```

</details>

### SP 1

- Field ID: `fld9fnbUWG`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[SP 1].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldkRED68l].LISTCOMBINE()
```

</details>

### Check UDTT

- Field ID: `fldbel27la`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[STT]).[Check UD Thanh toán].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tbll7MRKLPSgG0vV].$field[fld7MVTZRT]).$column[fldCHSV2y5].LISTCOMBINE()
```

</details>


<a id="table-tblwjezzr6tkw0wy"></a>

## NPI TEST_ Kết quả bài làm

- Table ID: `tblwjEZZR6tKW0wY`
- Công thức có nội dung: **42**

### TC4

- Field ID: `fldEOgUvUM`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC4]) = LOOKUP("TC4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldEOgUvUM]) = LOOKUP("TC4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP1

- Field ID: `fldLaRjs4M`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP1]) = LOOKUP("DP1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldLaRjs4M]) = LOOKUP("DP1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 8

- Field ID: `fldj5qVdGn`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[8]) = LOOKUP("8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldj5qVdGn]) = LOOKUP("8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TV2

- Field ID: `fldOak9OKY`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TV2]) = LOOKUP("TV2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldhymUU3o]) = LOOKUP("TV2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### KHO1

- Field ID: `flduitM2SF`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[KHO1]) = LOOKUP("KHO1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[flduitM2SF]) = LOOKUP("KHO1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC8

- Field ID: `fldiANbmUe`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC8]) = LOOKUP("TC8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldiANbmUe]) = LOOKUP("TC8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TN2

- Field ID: `fldQb3lK59`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TN2]) = LOOKUP("TN2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldsSBgGmm]) = LOOKUP("TN2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 7

- Field ID: `fldzGpazVR`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[7]) = LOOKUP("7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldzGpazVR]) = LOOKUP("7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 1

- Field ID: `fldoKOeLL9`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[1]) = LOOKUP("1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldoKOeLL9]) = LOOKUP("1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP10

- Field ID: `fldnUav8qK`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP10]) = LOOKUP("DP10", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldnUav8qK]) = LOOKUP("DP10", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP3

- Field ID: `fldtOzuUfB`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP3]) = LOOKUP("DP3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldtOzuUfB]) = LOOKUP("DP3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC1

- Field ID: `fldMtHgIj0`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC1]) = LOOKUP("TC1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldMtHgIj0]) = LOOKUP("TC1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### KHO4

- Field ID: `fldkZtsoUJ`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[KHO4]) = LOOKUP("KHO4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldkZtsoUJ]) = LOOKUP("KHO4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP2

- Field ID: `fldEpStKxF`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP2]) = LOOKUP("DP2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldEpStKxF]) = LOOKUP("DP2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### Thời gian

- Field ID: `fldl04rxBC`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[NPI_Bài làm].FILTER(CurrentValue.[Người]=[Người]).[Thời gian].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblQydIvgpS4zEsF].FILTER(CurrentValue.$column[fldHeVWy5J]=bitable::$table[tblwjEZZR6tKW0wY].$field[fldHeVWy5J]).$column[fldl04rxBC].LISTCOMBINE()
```

</details>

### DP8

- Field ID: `fldPIN7LnK`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP8]) = LOOKUP("DP8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldPIN7LnK]) = LOOKUP("DP8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 3

- Field ID: `fldWlx3u93`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[3]) = LOOKUP("3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldWlx3u93]) = LOOKUP("3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 6

- Field ID: `fldfyiAE2e`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[6]) = LOOKUP("6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldfyiAE2e]) = LOOKUP("6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP6

- Field ID: `fldcECVxrd`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP6]) = LOOKUP("DP6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldcECVxrd]) = LOOKUP("DP6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP5

- Field ID: `fldhZmdsVS`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP5]) = LOOKUP("DP5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldhZmdsVS]) = LOOKUP("DP5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 4

- Field ID: `fld1j3I3Vv`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[4]) = LOOKUP("4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fld1j3I3Vv]) = LOOKUP("4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC7

- Field ID: `fldK6hgIoU`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC7]) = LOOKUP("TC7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldK6hgIoU]) = LOOKUP("TC7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC5

- Field ID: `fldnxSkiFZ`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC5]) = LOOKUP("TC5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldnxSkiFZ]) = LOOKUP("TC5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TN1

- Field ID: `fldwd49Uyn`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TN1]) = LOOKUP("TN1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldwd49Uyn]) = LOOKUP("TN1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### Mã câu sai

- Field ID: `fldmiSQZmo`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Khu vực] = "Kho",
  CONCATENATE(IF([1]=0,"|1|",""), IF([2]=0,"|2|",""), IF([3]=0,"|3|",""), IF([4]=0,"|4|",""), IF([5]=0,"|5|",""), IF([6]=0,"|6|",""), IF([7]=0,"|7|",""), IF([8]=0,"|8|",""), IF([KHO1]=0,"|KHO1|",""), IF([KHO2]=0,"|KHO2|",""), IF([KHO3]=0,"|KHO3|",""), IF([KHO4]=0,"|KHO4|","")),

  [Khu vực] = "Thu ngân",
  CONCATENATE(IF([1]=0,"|1|",""), IF([2]=0,"|2|",""), IF([3]=0,"|3|",""), IF([4]=0,"|4|",""), IF([5]=0,"|5|",""), IF([6]=0,"|6|",""), IF([7]=0,"|7|",""), IF([8]=0,"|8|",""), IF([TN1]=0,"|TN1|",""), IF([TN2]=0,"|TN2|",""),IF([TN3]=0,"|TN3|","")),

  [Khu vực] = "Điều phối",
  CONCATENATE(IF([1]=0,"|1|",""), IF([2]=0,"|2|",""), IF([3]=0,"|3|",""), IF([4]=0,"|4|",""), IF([5]=0,"|5|",""), IF([6]=0,"|6|",""), IF([7]=0,"|7|",""), IF([8]=0,"|8|",""), IF([DP1]=0,"|DP1|",""), IF([DP2]=0,"|DP2|",""), IF([DP3]=0,"|DP3|",""), IF([DP4]=0,"|DP4|",""), IF([DP5]=0,"|DP5|",""), IF([DP6]=0,"|DP6|",""), IF([DP7]=0,"|DP7|",""), IF([DP8]=0,"|DP8|",""), IF([DP9]=0,"|DP9|",""), IF([DP10]=0,"|DP10|",""), IF([TV1]=0,"|TV1|",""), IF([TV2]=0,"|TV2|",""), IF([TV3]=0,"|TV3|",""), IF([TC1]=0,"|TC1|",""), IF([TC2]=0,"|TC2|",""), IF([TC3]=0,"|TC3|",""), IF([TC4]=0,"|TC4|",""), IF([TC5]=0,"|TC5|",""), IF([TC6]=0,"|TC6|",""), IF([TC7]=0,"|TC7|",""), IF([TC8]=0,"|TC8|",""),IF([KHO1]=0,"|KHO1|",""), IF([KHO2]=0,"|KHO2|",""), IF([KHO3]=0,"|KHO3|",""), IF([KHO4]=0,"|KHO4|",""),IF([TN1]=0,"|TN1|",""), IF([TN2]=0,"|TN2|",""),IF([TN3]=0,"|TN3|","")),

  OR([Khu vực] = "Tư vấn", [Khu vực] = "Kỹ thuật (Thu cũ & Backup)"),
  CONCATENATE(IF([1]=0,"|1|",""), IF([2]=0,"|2|",""), IF([3]=0,"|3|",""), IF([4]=0,"|4|",""), IF([5]=0,"|5|",""), IF([6]=0,"|6|",""), IF([7]=0,"|7|",""), IF([8]=0,"|8|",""), IF([TV1]=0,"|TV1|",""), IF([TV2]=0,"|TV2|",""), IF([TV3]=0,"|TV3|",""), IF([TC1]=0,"|TC1|",""), IF([TC2]=0,"|TC2|",""), IF([TC3]=0,"|TC3|",""), IF([TC4]=0,"|TC4|",""), IF([TC5]=0,"|TC5|",""), IF([TC6]=0,"|TC6|",""), IF([TC7]=0,"|TC7|",""), IF([TC8]=0,"|TC8|",""))
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Kho",
  CONCATENATE(IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9]=0,"|1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6]=0,"|2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93]=0,"|3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv]=0,"|4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ]=0,"|5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e]=0,"|6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR]=0,"|7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn]=0,"|8|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[flduitM2SF]=0,"|KHO1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldMAY3Me2]=0,"|KHO2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldna7vKI5]=0,"|KHO3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldkZtsoUJ]=0,"|KHO4|","")),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Thu ngân",
  CONCATENATE(IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9]=0,"|1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6]=0,"|2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93]=0,"|3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv]=0,"|4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ]=0,"|5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e]=0,"|6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR]=0,"|7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn]=0,"|8|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldwd49Uyn]=0,"|TN1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldQb3lK59]=0,"|TN2|",""),IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldBrymThH]=0,"|TN3|","")),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Điều phối",
  CONCATENATE(IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9]=0,"|1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6]=0,"|2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93]=0,"|3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv]=0,"|4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ]=0,"|5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e]=0,"|6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR]=0,"|7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn]=0,"|8|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldLaRjs4M]=0,"|DP1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldEpStKxF]=0,"|DP2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldtOzuUfB]=0,"|DP3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldOJBnOvc]=0,"|DP4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldhZmdsVS]=0,"|DP5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldcECVxrd]=0,"|DP6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldLKVJDMm]=0,"|DP7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldPIN7LnK]=0,"|DP8|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld7UiDNLh]=0,"|DP9|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldnUav8qK]=0,"|DP10|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldJdUHlHt]=0,"|TV1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldOak9OKY]=0,"|TV2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldc7S1jyG]=0,"|TV3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldMtHgIj0]=0,"|TC1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldsrASDSm]=0,"|TC2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldCT8CUdP]=0,"|TC3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldEOgUvUM]=0,"|TC4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldnxSkiFZ]=0,"|TC5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld8enfisz]=0,"|TC6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldK6hgIoU]=0,"|TC7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldiANbmUe]=0,"|TC8|",""),IF(bitable::$table[tblwjEZZR6tKW0wY].$field[flduitM2SF]=0,"|KHO1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldMAY3Me2]=0,"|KHO2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldna7vKI5]=0,"|KHO3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldkZtsoUJ]=0,"|KHO4|",""),IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldwd49Uyn]=0,"|TN1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldQb3lK59]=0,"|TN2|",""),IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldBrymThH]=0,"|TN3|","")),

  OR(bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Tư vấn", bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Kỹ thuật (Thu cũ & Backup)"),
  CONCATENATE(IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9]=0,"|1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6]=0,"|2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93]=0,"|3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv]=0,"|4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ]=0,"|5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e]=0,"|6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR]=0,"|7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn]=0,"|8|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldJdUHlHt]=0,"|TV1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldOak9OKY]=0,"|TV2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldc7S1jyG]=0,"|TV3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldMtHgIj0]=0,"|TC1|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldsrASDSm]=0,"|TC2|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldCT8CUdP]=0,"|TC3|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldEOgUvUM]=0,"|TC4|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldnxSkiFZ]=0,"|TC5|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fld8enfisz]=0,"|TC6|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldK6hgIoU]=0,"|TC7|",""), IF(bitable::$table[tblwjEZZR6tKW0wY].$field[fldiANbmUe]=0,"|TC8|",""))
)
```

</details>

### TV1

- Field ID: `fldJdUHlHt`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TV1]) = LOOKUP("TV1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldJdUHlHt]) = LOOKUP("TV1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC2

- Field ID: `fldsrASDSm`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC2]) = LOOKUP("TC2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldsrASDSm]) = LOOKUP("TC2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP7

- Field ID: `fldLKVJDMm`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP7]) = LOOKUP("DP7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldLKVJDMm]) = LOOKUP("DP7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### DP4

- Field ID: `fldOJBnOvc`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP4]) = LOOKUP("DP4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldOJBnOvc]) = LOOKUP("DP4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### Ghi chú các câu trả lời sai

- Field ID: `fldxMze1Pk`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE(
  IF(CONTAINS([Mã câu sai], "|1|"), "• " & LOOKUP("1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|2|"), "• " & LOOKUP("2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|3|"), "• " & LOOKUP("3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|4|"), "• " & LOOKUP("4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|5|"), "• " & LOOKUP("5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|6|"), "• " & LOOKUP("6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|7|"), "• " & LOOKUP("7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|8|"), "• " & LOOKUP("8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TV1|"), "• " & LOOKUP("TV1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TV2|"), "• " & LOOKUP("TV2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TV3|"), "• " & LOOKUP("TV3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP1|"), "• " & LOOKUP("DP1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP2|"), "• " & LOOKUP("DP2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP3|"), "• " & LOOKUP("DP3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP4|"), "• " & LOOKUP("DP4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP5|"), "• " & LOOKUP("DP5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP6|"), "• " & LOOKUP("DP6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP7|"), "• " & LOOKUP("DP7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP8|"), "• " & LOOKUP("DP8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP9|"), "• " & LOOKUP("DP9", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP9", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|DP10|"), "• " & LOOKUP("DP10", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP10", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|KHO1|"), "• " & LOOKUP("KHO1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|KHO2|"), "• " & LOOKUP("KHO2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|KHO3|"), "• " & LOOKUP("KHO3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|KHO4|"), "• " & LOOKUP("KHO4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC1|"), "• " & LOOKUP("TC1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC2|"), "• " & LOOKUP("TC2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC3|"), "• " & LOOKUP("TC3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC4|"), "• " & LOOKUP("TC4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC4", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC5|"), "• " & LOOKUP("TC5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC6|"), "• " & LOOKUP("TC6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC7|"), "• " & LOOKUP("TC7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC7", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TC8|"), "• " & LOOKUP("TC8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC8", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TN1|"), "• " & LOOKUP("TN1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TN1", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS([Mã câu sai], "|TN2|"), "• " & LOOKUP("TN2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Câu hỏi]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TN2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án], ""))
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|1|"), "• " & LOOKUP("1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|2|"), "• " & LOOKUP("2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|3|"), "• " & LOOKUP("3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|4|"), "• " & LOOKUP("4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|5|"), "• " & LOOKUP("5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|6|"), "• " & LOOKUP("6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|7|"), "• " & LOOKUP("7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|8|"), "• " & LOOKUP("8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TV1|"), "• " & LOOKUP("TV1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TV2|"), "• " & LOOKUP("TV2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TV3|"), "• " & LOOKUP("TV3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TV3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP1|"), "• " & LOOKUP("DP1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP2|"), "• " & LOOKUP("DP2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP3|"), "• " & LOOKUP("DP3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP4|"), "• " & LOOKUP("DP4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP5|"), "• " & LOOKUP("DP5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP6|"), "• " & LOOKUP("DP6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP7|"), "• " & LOOKUP("DP7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP8|"), "• " & LOOKUP("DP8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP9|"), "• " & LOOKUP("DP9", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP9", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|DP10|"), "• " & LOOKUP("DP10", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("DP10", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|KHO1|"), "• " & LOOKUP("KHO1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|KHO2|"), "• " & LOOKUP("KHO2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|KHO3|"), "• " & LOOKUP("KHO3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|KHO4|"), "• " & LOOKUP("KHO4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("KHO4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC1|"), "• " & LOOKUP("TC1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC2|"), "• " & LOOKUP("TC2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC3|"), "• " & LOOKUP("TC3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC4|"), "• " & LOOKUP("TC4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC4", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC5|"), "• " & LOOKUP("TC5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC6|"), "• " & LOOKUP("TC6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC7|"), "• " & LOOKUP("TC7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC7", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TC8|"), "• " & LOOKUP("TC8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TC8", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TN1|"), "• " & LOOKUP("TN1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TN1", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]) & CHAR(10) & CHAR(10), ""),
  IF(CONTAINS(bitable::$table[tblwjEZZR6tKW0wY].$field[fldmiSQZmo], "|TN2|"), "• " & LOOKUP("TN2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldCmN47Eu]) & CHAR(10) & "  ➔ Đáp án đúng: " & LOOKUP("TN2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7], ""))
)
```

</details>

### KHO2

- Field ID: `fldMAY3Me2`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[KHO2]) = LOOKUP("KHO2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldMAY3Me2]) = LOOKUP("KHO2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 2

- Field ID: `fldvyoQix6`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[2]) = LOOKUP("2", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldvyoQix6]) = LOOKUP("2", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### 5

- Field ID: `fldl7Jw8fQ`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[5]) = LOOKUP("5", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldl7Jw8fQ]) = LOOKUP("5", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TC6

- Field ID: `fld8enfisz`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC6]) = LOOKUP("TC6", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fld8enfisz]) = LOOKUP("TC6", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TV3

- Field ID: `fldc7S1jyG`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TV3]) = LOOKUP("TV3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldui6ESk9]) = LOOKUP("TV3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### TN3

- Field ID: `fldBrymThH`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TN3]) = LOOKUP("TN3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldDgIKobC]) = LOOKUP("TN3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### Mã bản ghi

- Field ID: `fld3NBJtv0`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE([Người], "_", [Thứ tự bản ghi])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(bitable::$table[tblwjEZZR6tKW0wY].$field[fldHeVWy5J], "_", bitable::$table[tblwjEZZR6tKW0wY].$field[fldTtcLn1P])
```

</details>

### DP9

- Field ID: `fld7UiDNLh`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[DP9]) = LOOKUP("DP9", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fld7UiDNLh]) = LOOKUP("DP9", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### Khu vực

- Field ID: `fldniC9G5r`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[NPI_Bài làm].FILTER(CurrentValue.[Người]=[Người]).[Khu vực].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tblQydIvgpS4zEsF].FILTER(CurrentValue.$column[fldHeVWy5J]=bitable::$table[tblwjEZZR6tKW0wY].$field[fldHeVWy5J]).$column[fldniC9G5r].LISTCOMBINE().UNIQUE()
```

</details>

### ĐIỂM

- Field ID: `fldqnZJMbP`
- Loại: `Formula`

Công thức theo tên:

```text
IFS(
  [Khu vực] = "Kho",
  CONCATENATE(SUM([1], [2], [3], [4], [5], [6], [7], [8], [KHO1], [KHO2], [KHO3], [KHO4]), "/12"),

  [Khu vực] = "Thu ngân",
  CONCATENATE(SUM([1], [2], [3], [4], [5], [6], [7], [8], [TN1], [TN2],[TN3]), "/11"),

  [Khu vực] = "Điều phối",
  CONCATENATE(SUM([1], [2], [3], [4], [5], [6], [7], [8], [DP1], [DP2], [DP3], [DP4], [DP5], [DP6], [DP7], [DP8], [DP9], [DP10],[KHO1], [KHO2], [KHO3], [KHO4],[TN1], [TN2],[TN3], [TV1], [TV2], [TV3], [TC1], [TC2],[TC3], [TC4], [TC5], [TC6], [TC7], [TC8]), "/36"),

  [Khu vực] = "Tư vấn",
  CONCATENATE(SUM([1], [2], [3], [4], [5], [6], [7], [8], [TV1], [TV2],[TV3], [TC1], [TC2],[TC3], [TC4], [TC5], [TC6], [TC7], [TC8]), "/19"),

  [Khu vực] = "Kỹ thuật (Thu cũ & Backup)",
  CONCATENATE(SUM([1], [2], [3], [4], [5], [6], [7], [8], [TC1], [TC2], [TC3], [TC4], [TC5], [TC6], [TC7], [TC8]), "/16")
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IFS(
  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Kho",
  CONCATENATE(SUM(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9], bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6], bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93], bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv], bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ], bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e], bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR], bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn], bitable::$table[tblwjEZZR6tKW0wY].$field[flduitM2SF], bitable::$table[tblwjEZZR6tKW0wY].$field[fldMAY3Me2], bitable::$table[tblwjEZZR6tKW0wY].$field[fldna7vKI5], bitable::$table[tblwjEZZR6tKW0wY].$field[fldkZtsoUJ]), "/12"),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Thu ngân",
  CONCATENATE(SUM(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9], bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6], bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93], bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv], bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ], bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e], bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR], bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldwd49Uyn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldQb3lK59],bitable::$table[tblwjEZZR6tKW0wY].$field[fldBrymThH]), "/11"),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Điều phối",
  CONCATENATE(SUM(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9], bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6], bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93], bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv], bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ], bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e], bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR], bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldLaRjs4M], bitable::$table[tblwjEZZR6tKW0wY].$field[fldEpStKxF], bitable::$table[tblwjEZZR6tKW0wY].$field[fldtOzuUfB], bitable::$table[tblwjEZZR6tKW0wY].$field[fldOJBnOvc], bitable::$table[tblwjEZZR6tKW0wY].$field[fldhZmdsVS], bitable::$table[tblwjEZZR6tKW0wY].$field[fldcECVxrd], bitable::$table[tblwjEZZR6tKW0wY].$field[fldLKVJDMm], bitable::$table[tblwjEZZR6tKW0wY].$field[fldPIN7LnK], bitable::$table[tblwjEZZR6tKW0wY].$field[fld7UiDNLh], bitable::$table[tblwjEZZR6tKW0wY].$field[fldnUav8qK],bitable::$table[tblwjEZZR6tKW0wY].$field[flduitM2SF], bitable::$table[tblwjEZZR6tKW0wY].$field[fldMAY3Me2], bitable::$table[tblwjEZZR6tKW0wY].$field[fldna7vKI5], bitable::$table[tblwjEZZR6tKW0wY].$field[fldkZtsoUJ],bitable::$table[tblwjEZZR6tKW0wY].$field[fldwd49Uyn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldQb3lK59],bitable::$table[tblwjEZZR6tKW0wY].$field[fldBrymThH], bitable::$table[tblwjEZZR6tKW0wY].$field[fldJdUHlHt], bitable::$table[tblwjEZZR6tKW0wY].$field[fldOak9OKY], bitable::$table[tblwjEZZR6tKW0wY].$field[fldc7S1jyG], bitable::$table[tblwjEZZR6tKW0wY].$field[fldMtHgIj0], bitable::$table[tblwjEZZR6tKW0wY].$field[fldsrASDSm],bitable::$table[tblwjEZZR6tKW0wY].$field[fldCT8CUdP], bitable::$table[tblwjEZZR6tKW0wY].$field[fldEOgUvUM], bitable::$table[tblwjEZZR6tKW0wY].$field[fldnxSkiFZ], bitable::$table[tblwjEZZR6tKW0wY].$field[fld8enfisz], bitable::$table[tblwjEZZR6tKW0wY].$field[fldK6hgIoU], bitable::$table[tblwjEZZR6tKW0wY].$field[fldiANbmUe]), "/36"),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Tư vấn",
  CONCATENATE(SUM(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9], bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6], bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93], bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv], bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ], bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e], bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR], bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldJdUHlHt], bitable::$table[tblwjEZZR6tKW0wY].$field[fldOak9OKY],bitable::$table[tblwjEZZR6tKW0wY].$field[fldc7S1jyG], bitable::$table[tblwjEZZR6tKW0wY].$field[fldMtHgIj0], bitable::$table[tblwjEZZR6tKW0wY].$field[fldsrASDSm],bitable::$table[tblwjEZZR6tKW0wY].$field[fldCT8CUdP], bitable::$table[tblwjEZZR6tKW0wY].$field[fldEOgUvUM], bitable::$table[tblwjEZZR6tKW0wY].$field[fldnxSkiFZ], bitable::$table[tblwjEZZR6tKW0wY].$field[fld8enfisz], bitable::$table[tblwjEZZR6tKW0wY].$field[fldK6hgIoU], bitable::$table[tblwjEZZR6tKW0wY].$field[fldiANbmUe]), "/19"),

  bitable::$table[tblwjEZZR6tKW0wY].$field[fldniC9G5r] = "Kỹ thuật (Thu cũ & Backup)",
  CONCATENATE(SUM(bitable::$table[tblwjEZZR6tKW0wY].$field[fldoKOeLL9], bitable::$table[tblwjEZZR6tKW0wY].$field[fldvyoQix6], bitable::$table[tblwjEZZR6tKW0wY].$field[fldWlx3u93], bitable::$table[tblwjEZZR6tKW0wY].$field[fld1j3I3Vv], bitable::$table[tblwjEZZR6tKW0wY].$field[fldl7Jw8fQ], bitable::$table[tblwjEZZR6tKW0wY].$field[fldfyiAE2e], bitable::$table[tblwjEZZR6tKW0wY].$field[fldzGpazVR], bitable::$table[tblwjEZZR6tKW0wY].$field[fldj5qVdGn], bitable::$table[tblwjEZZR6tKW0wY].$field[fldMtHgIj0], bitable::$table[tblwjEZZR6tKW0wY].$field[fldsrASDSm], bitable::$table[tblwjEZZR6tKW0wY].$field[fldCT8CUdP], bitable::$table[tblwjEZZR6tKW0wY].$field[fldEOgUvUM], bitable::$table[tblwjEZZR6tKW0wY].$field[fldnxSkiFZ], bitable::$table[tblwjEZZR6tKW0wY].$field[fld8enfisz], bitable::$table[tblwjEZZR6tKW0wY].$field[fldK6hgIoU], bitable::$table[tblwjEZZR6tKW0wY].$field[fldiANbmUe]), "/16")
)
```

</details>

### TC3

- Field ID: `fldCT8CUdP`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[TC3]) = LOOKUP("TC3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldCT8CUdP]) = LOOKUP("TC3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>

### KHO3

- Field ID: `fldna7vKI5`
- Loại: `Formula`

Công thức theo tên:

```text
IF(
  LOOKUP([Mã bản ghi], [NPI_Bài làm].[Mã bản ghi], [NPI_Bài làm].[KHO3]) = LOOKUP("KHO3", [NPI TEST_ Đề bài & đáp án].[Mã câu hỏi], [NPI TEST_ Đề bài & đáp án].[Đáp án]),
  1,
  0
)
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
IF(
  LOOKUP(bitable::$table[tblwjEZZR6tKW0wY].$field[fld3NBJtv0], bitable::$table[tblQydIvgpS4zEsF].$column[fldrb6Pj6z], bitable::$table[tblQydIvgpS4zEsF].$column[fldna7vKI5]) = LOOKUP("KHO3", bitable::$table[tbljLhsuxxFClAzI].$column[fldwwJbHay], bitable::$table[tbljLhsuxxFClAzI].$column[fldpVHSiS7]),
  1,
  0
)
```

</details>


<a id="table-tblqydivgps4zesf"></a>

## NPI_Bài làm

- Table ID: `tblQydIvgpS4zEsF`
- Công thức có nội dung: **1**

### Mã bản ghi

- Field ID: `fldrb6Pj6z`
- Loại: `Formula`

Công thức theo tên:

```text
CONCATENATE([Người], "_", [Thứ tự bản ghi])
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
CONCATENATE(bitable::$table[tblQydIvgpS4zEsF].$field[fldHeVWy5J], "_", bitable::$table[tblQydIvgpS4zEsF].$field[fldGlIHGXs])
```

</details>


<a id="table-tblts5i2slutv2fm"></a>

## STT + Status

- Table ID: `tblTS5i2slUtV2Fm`
- Công thức có nội dung: **7**

### Ns Back up

- Field ID: `fldmeBXWyD`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[DS Backup].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fldLWBBwTv].LISTCOMBINE().UNIQUE()
```

</details>

### Status tư vấn

- Field ID: `fld0hmhEM8`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[Status in tư vấn].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fldkyTVtcU].LISTCOMBINE().UNIQUE()
```

</details>

### Ns thu cũ

- Field ID: `fldxhfBHYJ`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[DS Thu cũ].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fld0Z1nlar].LISTCOMBINE()
```

</details>

### SDT

- Field ID: `fldoFA95lO`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Check in].FILTER(CurrentValue.[STT]=[Selection_STT]).[SDT].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbl8Ch0cFICX9nQV].FILTER(CurrentValue.$column[fldvnrys2u]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fldDSuXdZn].LISTCOMBINE()
```

</details>

### Ns Tư vấn

- Field ID: `fldI4kmIXD`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[DS Tư vấn].LISTCOMBINE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fldhvgL0d9].LISTCOMBINE()
```

</details>

### Status thu cũ

- Field ID: `fldPsApiJa`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[Status in thu cũ].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fldDj1873T].LISTCOMBINE().UNIQUE()
```

</details>

### Status Back up

- Field ID: `fldvpGCGwG`
- Loại: `Lookup/Rollup`

Công thức theo tên:

```text
[Master_Điều phối].FILTER(CurrentValue.[STT]=[Selection_STT]).[Status in backup].LISTCOMBINE().UNIQUE()
```

<details>
<summary>Biểu thức gốc trong file Base</summary>

```text
bitable::$table[tbll7MRKLPSgG0vV].FILTER(CurrentValue.$column[fld7MVTZRT]=bitable::$table[tblTS5i2slUtV2Fm].$field[fldKypZwzl]).$column[fld4rEDKuK].LISTCOMBINE().UNIQUE()
```

</details>
