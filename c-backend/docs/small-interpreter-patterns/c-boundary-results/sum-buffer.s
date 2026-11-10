	.build_version macos, 26, 5	sdk_version 26, 5
	.section	__TEXT,__text,regular,pure_instructions
	.globl	_numeric_main                   ; -- Begin function numeric_main
	.p2align	2
_numeric_main:                          ; @numeric_main
	.cfi_startproc
; %bb.0:
	movi.2d	v1, #0000000000000000
	fcmp	d0, #0.0
	b.le	LBB0_3
; %bb.1:
	fmov	d2, #1.00000000
	movi.2d	v3, #0000000000000000
LBB0_2:                                 ; =>This Inner Loop Header: Depth=1
	fadd	d1, d3, d1
	fadd	d3, d3, d2
	fcmp	d3, d0
	b.mi	LBB0_2
LBB0_3:
	mov.16b	v0, v1
	ret
	.cfi_endproc
                                        ; -- End function
.subsections_via_symbols
