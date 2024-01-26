module top (
    input clock,
    input reset,
    output blink
);
    reg out;

    always @(posedge clock) begin
        if (reset) begin
            out = 1'b0;
        end else begin
            out <= !out;
        end
    end

    assign blink = out; 

initial begin
          $dumpfile("top.vcd");
      $dumpvars(0,top);
end
endmodule
